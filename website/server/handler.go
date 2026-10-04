// Package server adapts Rovito's public website handler; it has no private-service routes.
package server

import (
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"net/http"
	"path"
	"regexp"
	"strings"
)

var publicFiles = map[string]bool{
	"index.html": true, "method.html": true, "status.html": true,
	"app.js": true, "styles.css": true, "theme.css": true,
	"robots.txt": true, "sitemap.xml": true, "version.json": true,
	"assets/mascot-board-v1.png": true, "assets/lockup-graphite-v1.png": true,
	"assets/avatar-graphite-v1.png": true,
}

var revision = regexp.MustCompile(`^(local|[0-9a-f]{40})$`)

// Validate checks website readiness, not any Pigboard product integration.
func Validate(site fs.FS) error {
	index, err := fs.ReadFile(site, "index.html")
	if err != nil || len(index) == 0 {
		return fmt.Errorf("missing website index; run node website/build.mjs")
	}
	data, err := fs.ReadFile(site, "version.json")
	if err != nil {
		return fmt.Errorf("missing website version; rebuild the site")
	}
	var version struct {
		Commit string `json:"commit"`
	}
	if json.Unmarshal(data, &version) != nil || !revision.MatchString(version.Commit) {
		return fmt.Errorf("invalid website version; rebuild the site")
	}
	return nil
}

func Handler(site fs.FS) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		w.Header().Set("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'")
		w.Header().Set("Cache-Control", "no-cache")
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			w.Header().Set("Allow", "GET, HEAD")
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		if r.URL.Path == "/healthz" || r.URL.Path == "/readyz" {
			ok := r.URL.Path == "/healthz" || Validate(site) == nil
			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("Cache-Control", "no-store")
			if !ok {
				w.WriteHeader(http.StatusServiceUnavailable)
			}
			if r.Method != http.MethodHead {
				_ = json.NewEncoder(w).Encode(map[string]bool{"ok": ok})
			}
			return
		}
		name := strings.TrimPrefix(r.URL.Path, "/")
		if name == "" {
			name = "index.html"
		}
		if !publicFiles[name] || !fs.ValidPath(name) || strings.Contains(name, "\\") {
			http.NotFound(w, r)
			return
		}
		for _, segment := range strings.Split(name, "/") {
			if strings.HasPrefix(segment, ".") {
				http.NotFound(w, r)
				return
			}
		}
		file, err := site.Open(name)
		if err != nil {
			http.NotFound(w, r)
			return
		}
		defer file.Close()
		info, err := file.Stat()
		if err != nil || info.IsDir() {
			http.NotFound(w, r)
			return
		}
		reader, ok := file.(io.ReadSeeker)
		if !ok {
			http.Error(w, "File unavailable", http.StatusInternalServerError)
			return
		}
		if name == "version.json" {
			w.Header().Set("Cache-Control", "no-store")
		}
		http.ServeContent(w, r, path.Base(name), info.ModTime(), reader)
	})
}
