package handler

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/labstack/echo/v4"

	"github.com/gdgoc/ice-cream-sandwich/agent"
	"github.com/gdgoc/ice-cream-sandwich/mcp"
)

// Stream serves /api/chat/stream. Same request shape as POST /api/chat;
// response is text/event-stream with three event types:
//
//	event: delta   data: {"text": "..."}     // text fragment from the model
//	event: done    data: {"used_tools":[...], "places":[...]} // run finished
//	event: error   data: {"message": "..."}  // run aborted
func Stream(c echo.Context) error {
	var req ChatRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid payload"})
	}

	res := c.Response()
	res.Header().Set("Content-Type", "text/event-stream")
	res.Header().Set("Cache-Control", "no-cache")
	res.Header().Set("Connection", "keep-alive")
	res.Header().Set("X-Accel-Buffering", "no")
	res.WriteHeader(http.StatusOK)
	flusher, ok := res.Writer.(http.Flusher)
	if !ok {
		return fmt.Errorf("streaming unsupported")
	}

	send := func(eventType string, payload any) {
		b, err := json.Marshal(payload)
		if err != nil {
			return
		}
		fmt.Fprintf(res.Writer, "event: %s\ndata: %s\n\n", eventType, b)
		flusher.Flush()
	}

	err := agent.RunStream(c.Request().Context(), req.Message, req.History, agent.StreamHandler{
		OnDelta: func(text string) {
			send("delta", map[string]string{"text": text})
		},
		OnDone: func(usedTools []string, places []mcp.Place) {
			payload := map[string]any{
				"used_tools": usedTools,
			}
			if len(places) > 0 {
				payload["places"] = places
			}
			send("done", payload)
		},
	})
	if err != nil {
		send("error", map[string]string{"message": err.Error()})
	}
	return nil
}
