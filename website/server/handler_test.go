package server

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"testing/fstest"
)

func fixture() fstest.MapFS {
	return fstest.MapFS{
		"index.html":                 {Data: []byte("<h1>Pigboard</h1>")},
		"method.html":                {Data: []byte("method")},
		"version.json":               {Data: []byte(`{"commit":"local","preview":true}`)},
		"styles.css":                 {Data: []byte("body {}")},
		"assets/mascot-board-v1.png": {Data: []byte("0123456789")},
		"unlisted.txt":               {Data: []byte("not generated")},
		".private":                   {Data: []byte("not public")},
	}
}
func TestRoutesAndBoundaries(t *testing.T) {
	handler := Handler(fixture())
	for _, tc := range []struct {
		method, target string
		status         int
		body           string
	}{
		{"GET", "/", 200, "<h1>Pigboard</h1>"}, {"HEAD", "/", 200, ""},
		{"GET", "/index.html", 200, "<h1>Pigboard</h1>"}, {"GET", "/method.html", 200, "method"},
		{"GET", "/missing", 404, "404 page not found\n"}, {"GET", "/unlisted.txt", 404, "404 page not found\n"}, {"GET", "/assets/", 404, "404 page not found\n"},
		{"GET", "/assets", 404, "404 page not found\n"}, {"GET", "/.private", 404, "404 page not found\n"},
		{"GET", "/%2e%2e/.private", 404, "404 page not found\n"}, {"GET", "/assets/%5csecret", 404, "404 page not found\n"},
		{"GET", "/v1/authority/me", 404, "404 page not found\n"}, {"POST", "/", 405, "Method not allowed\n"},
		{"POST", "/readyz", 405, "Method not allowed\n"},
	} {
		t.Run(tc.method+tc.target, func(t *testing.T) {
			w := httptest.NewRecorder()
			handler.ServeHTTP(w, httptest.NewRequest(tc.method, tc.target, nil))
			if w.Code != tc.status || w.Body.String() != tc.body {
				t.Fatalf("got %d %q", w.Code, w.Body.String())
			}
			if w.Header().Get("X-Content-Type-Options") != "nosniff" || !strings.Contains(w.Header().Get("Content-Security-Policy"), "frame-ancestors 'none'") {
				t.Fatal("missing security headers")
			}
			if tc.status == 405 && w.Header().Get("Allow") != "GET, HEAD" {
				t.Fatal("missing allowed methods")
			}
		})
	}
}
func TestProbesDescribeOnlyWebsite(t *testing.T) {
	for _, broken := range []string{"", "index.html", "version.json", "malformed"} {
		t.Run(broken, func(t *testing.T) {
			site := fixture()
			if broken == "malformed" {
				site["version.json"] = &fstest.MapFile{Data: []byte(`{"commit":"bad"}`)}
			} else if broken != "" {
				delete(site, broken)
			}
			for _, route := range []string{"/healthz", "/readyz"} {
				w := httptest.NewRecorder()
				Handler(site).ServeHTTP(w, httptest.NewRequest("GET", route, nil))
				want := http.StatusOK
				if broken != "" && route == "/readyz" {
					want = http.StatusServiceUnavailable
				}
				if w.Code != want || w.Header().Get("Cache-Control") != "no-store" {
					t.Fatalf("%s: %d %v", route, w.Code, w.Header())
				}
			}
			if (Validate(site) == nil) != (broken == "") {
				t.Fatal("startup validation does not match readiness")
			}
		})
	}
}
func TestStaticMetadataAndRanges(t *testing.T) {
	handler := Handler(fixture())
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, httptest.NewRequest("GET", "/styles.css", nil))
	if !strings.HasPrefix(w.Header().Get("Content-Type"), "text/css") || w.Header().Get("Cache-Control") != "no-cache" {
		t.Fatal(w.Header())
	}
	w = httptest.NewRecorder()
	handler.ServeHTTP(w, httptest.NewRequest("GET", "/version.json", nil))
	if w.Header().Get("Cache-Control") != "no-store" {
		t.Fatal("stale version policy")
	}
	r := httptest.NewRequest("GET", "/assets/mascot-board-v1.png", nil)
	r.Header.Set("Range", "bytes=2-5")
	w = httptest.NewRecorder()
	handler.ServeHTTP(w, r)
	if w.Code != 206 || w.Body.String() != "2345" {
		t.Fatalf("range: %d %s", w.Code, w.Body.String())
	}
	w = httptest.NewRecorder()
	handler.ServeHTTP(w, httptest.NewRequest("HEAD", "/readyz", nil))
	if w.Code != 200 || w.Body.Len() != 0 {
		t.Fatal("HEAD probe body")
	}
}

func TestRootedFilesystemRejectsSymlinkEscape(t *testing.T) {
	parent := t.TempDir()
	dir := filepath.Join(parent, "site")
	if err := os.Mkdir(dir, 0700); err != nil {
		t.Fatal(err)
	}
	for name, data := range map[string]string{"index.html": "<h1>Pigboard</h1>", "version.json": `{"commit":"local"}`} {
		if err := os.WriteFile(filepath.Join(dir, name), []byte(data), 0600); err != nil {
			t.Fatal(err)
		}
	}
	if err := os.WriteFile(filepath.Join(parent, "secret.txt"), []byte("OUTSIDE_SENTINEL"), 0600); err != nil {
		t.Fatal(err)
	}
	// Even an allowlisted filename cannot escape the root through a symlink.
	if err := os.Symlink("../secret.txt", filepath.Join(dir, "styles.css")); err != nil {
		t.Fatal(err)
	}
	root, err := os.OpenRoot(dir)
	if err != nil {
		t.Fatal(err)
	}
	defer root.Close()
	site := root.FS()
	if err := Validate(site); err != nil {
		t.Fatal(err)
	}
	w := httptest.NewRecorder()
	Handler(site).ServeHTTP(w, httptest.NewRequest("GET", "/styles.css", nil))
	if w.Code != 404 || strings.Contains(w.Body.String(), "OUTSIDE_SENTINEL") {
		t.Fatalf("escaped public root: %d %s", w.Code, w.Body)
	}
}
