package main

import (
    "embed"
    "io/fs"
    "net/http"
    "os"
    "strings"

    "github.com/labstack/echo/v4"
    "github.com/labstack/echo/v4/middleware"
    "github.com/gdgoc/ice-cream-sandwich/handler"
    "github.com/gdgoc/ice-cream-sandwich/agent"
)

//go:embed frontend/dist
var staticFiles embed.FS

func main() {
    agent.Init()

    e := echo.New()
    e.Use(middleware.Logger())
    e.Use(middleware.CORS())

    e.POST("/api/chat", handler.Chat)
    e.POST("/api/chat/stream", handler.Stream)

    distFS, _ := fs.Sub(staticFiles, "frontend/dist")

    // Serve static assets; fall back to index.html for SPA client-side routes.
    e.GET("/*", func(c echo.Context) error {
        path := strings.TrimPrefix(c.Request().URL.Path, "/")
        if path == "" {
            path = "index.html"
        }
        if _, err := fs.Stat(distFS, path); err != nil {
            path = "index.html"
        }
        f, err := distFS.Open(path)
        if err != nil {
            return c.String(http.StatusNotFound, "Frontend not built yet")
        }
        defer f.Close()
        return c.Stream(http.StatusOK, mimeForPath(path), f)
    })

    port := os.Getenv("PORT")
    if port == "" {
        port = "8080"
    }
    e.Logger.Fatal(e.Start(":" + port))
}

func mimeForPath(p string) string {
    switch {
    case strings.HasSuffix(p, ".html"):
        return "text/html; charset=utf-8"
    case strings.HasSuffix(p, ".js"):
        return "application/javascript"
    case strings.HasSuffix(p, ".css"):
        return "text/css; charset=utf-8"
    case strings.HasSuffix(p, ".svg"):
        return "image/svg+xml"
    case strings.HasSuffix(p, ".json"):
        return "application/json"
    case strings.HasSuffix(p, ".png"):
        return "image/png"
    case strings.HasSuffix(p, ".jpg"), strings.HasSuffix(p, ".jpeg"):
        return "image/jpeg"
    case strings.HasSuffix(p, ".woff2"):
        return "font/woff2"
    case strings.HasSuffix(p, ".woff"):
        return "font/woff"
    default:
        return "application/octet-stream"
    }
}
