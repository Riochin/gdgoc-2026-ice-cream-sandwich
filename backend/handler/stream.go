package handler

import (
    "github.com/labstack/echo/v4"
)

func Stream(c echo.Context) error {
    // オプション（未実装）
    // Set SSE headers (`Content-Type: text/event-stream`).
    // Call `agent.RunStream()`, write events: `message.delta`, `final`, `error`.
    return echo.ErrNotImplemented
}
