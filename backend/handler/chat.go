package handler

import (
    "net/http"

    "github.com/labstack/echo/v4"
    "github.com/gdgoc/ice-cream-sandwich/agent"
)

type ChatRequest struct {
    SessionID string      `json:"session_id"`
    Message   string      `json:"message"`
    History   interface{} `json:"history"` // using interface{} to pass as-is
}

type ChatResponse struct {
    Reply    string                 `json:"reply"`
    Metadata map[string]interface{} `json:"metadata"`
}

func Chat(c echo.Context) error {
    var req ChatRequest
    if err := c.Bind(&req); err != nil {
        return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid payload"})
    }

    ctx := c.Request().Context()
    
    reply, usedTools, err := agent.Run(ctx, req.Message, req.History)
    if err != nil {
        return c.JSON(http.StatusInternalServerError, map[string]string{"reply": "検索に失敗しました、再試行してください"})
    }

    return c.JSON(http.StatusOK, ChatResponse{
        Reply: reply,
        Metadata: map[string]interface{}{
            "used_tools": usedTools,
        },
    })
}
