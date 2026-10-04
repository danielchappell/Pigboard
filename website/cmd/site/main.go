// The local preview and deployed site use this same executable and handler.
package main

import (
	"context"
	"errors"
	"flag"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"pigboard.website/server"
)

func main() {
	listen := flag.String("listen", "127.0.0.1:8772", "listen address (loopback by default)")
	directory := flag.String("site", "dist/website", "built public website directory")
	flag.Parse()
	root, err := os.OpenRoot(*directory)
	if err != nil {
		log.Fatalf("cannot open website directory; run node website/build.mjs: %v", err)
	}
	defer root.Close()
	site := root.FS()
	if err := server.Validate(site); err != nil {
		log.Fatal(err)
	}
	listener, err := net.Listen("tcp", *listen)
	if err != nil {
		log.Fatal(err)
	}
	service := &http.Server{Handler: server.Handler(site), ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 30 * time.Second, WriteTimeout: 30 * time.Second, IdleTimeout: 60 * time.Second}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	stopped := make(chan error, 1)
	go func() { stopped <- service.Serve(listener) }()
	log.Printf("Pigboard website: http://%s", listener.Addr())
	select {
	case err := <-stopped:
		if !errors.Is(err, http.ErrServerClosed) {
			log.Fatal(err)
		}
	case <-ctx.Done():
		shutdown, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := service.Shutdown(shutdown); err != nil {
			_ = service.Close()
			log.Fatal(err)
		}
		if err := <-stopped; !errors.Is(err, http.ErrServerClosed) {
			log.Fatal(err)
		}
	}
}
