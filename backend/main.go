package main

import (
    "embed"
    "io/fs"
    "net/http"
    "os"

    "github.com/labstack/echo/v5"
    "github.com/labstack/echo/v5/middleware"
    "github.com/gdgoc/ice-cream-sandwich/handler"
    "github.com/gdgoc/ice-cream-sandwich/agent"
)

//go:embed frontend/dist
var staticFiles embed.FS

func main() {
    agent.Init()

    e := echo.New()
    e.Use(middleware.Logger())
    e.Use(middleware.CORS())  // FRONTEND_ORIGIN は不要（同一オリジンで配信）

    // API routes
    e.POST("/api/chat", handler.Chat)
    e.GET("/api/chat/stream", handler.Stream) // オプション

    // SPA 静的ファイル配信
    distFS, _ := fs.Sub(staticFiles, "frontend/dist")
    e.StaticFS("/", distFS)
    // SPAフォールバック: 全未知パスを index.html へ
    e.GET("/*", func(c echo.Context) error {
        return c.FileFS("index.html", distFS)
    })

    port := os.Getenv("PORT")
    if port == "" {
        port = "8080"
    }
    e.Logger.Fatal(e.Start(":" + port))
}
