# Skill: Generate Backend

## Purpose
Generate the complete Go backend under `backend/` based on `production_artifacts/Technical_Specification.md`.
フロント静的ファイルを `embed.FS` でバイナリに埋め込み、Cloud Run 1サービスで配信する。

## Pre-condition
`production_artifacts/Technical_Specification.md` must exist and be approved.

## Steps

### 1. Read the Spec
Read `production_artifacts/Technical_Specification.md` in full before writing any code.

### 2. Scaffold Directory Structure

```
backend/                   ← Go module root
├── main.go                  # embed.FS + Echo entrypoint
├── go.mod
├── go.sum
├── .env.example
├── Dockerfile               # multi-stage: Node → Go
├── handler/
│   ├── chat.go              # POST /api/chat
│   └── stream.go            # GET /api/chat/stream（オプション）
├── agent/
│   ├── agent.go             # ADK agent setup
│   └── prompt.go            # System prompt constant
└── mcp/
    ├── maps.go              # search_places, compute_routes
    └── search.go            # google_search
```

> `frontend/` ディレクトリは @frontend が `frontend/` に生成する。
> `frontend/dist/` が存在することを前提に embed する。

### 3. Implement Each File

#### main.go
```go
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
        return c.File("frontend/dist/index.html") // または FileFS
    })

    port := os.Getenv("PORT")
    if port == "" {
        port = "8080"
    }
    e.Logger.Fatal(e.Start(":" + port))
}
```

#### handler/chat.go
- Parse JSON body: `{session_id, message, history}`.
- Pass `history` as-is to `agent.Run()` — do NOT store in backend memory.
- Return JSON: `{reply, metadata: {used_tools}}`.
- On error: return `{"reply": "検索に失敗しました、再試行してください"}`.

#### handler/stream.go（オプション — 間に合わなければスキップ可）
- Set SSE headers (`Content-Type: text/event-stream`).
- Call `agent.RunStream()`, write events: `message.delta`, `final`, `error`.

#### agent/agent.go
- Create an `adk.Agent` with Gemini Flash and the system prompt from `prompt.go`.
- Register MCP tools: `search_places`, `compute_routes`, `google_search`.
- Expose `Run(ctx, message, history) (string, []string, error)`.

#### agent/prompt.go
- Define the system prompt constant exactly as written in spec §6.

#### mcp/maps.go
- `SearchPlaces(ctx, location, keyword, openNow, priceLevel) ([]Place, error)`
- `ComputeRoutes(ctx, origin, destination, travelMode) (Route, error)`
- Endpoint from env var `MAPS_MCP_URL`.

#### mcp/search.go
- `GoogleSearch(ctx, query) ([]SearchResult, error)`
- Endpoint from env var `SEARCH_MCP_URL`.

### 4. Write go.mod
```
module github.com/gdgoc/ice-cream-sandwich

go 1.21

require (
    github.com/labstack/echo/v5 v5.0.0-beta.0
    github.com/google/adk-go v0.1.0
)
```

### 5. Write .env.example
```
GEMINI_API_KEY=
MAPS_MCP_URL=
SEARCH_MCP_URL=
PORT=8080
```
APIキーは絶対にコード内にハードコードしない。

### 6. Write Dockerfile（multi-stage）
```dockerfile
# Stage 1: Build React frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# Stage 2: Build Go binary with embedded frontend
FROM golang:1.21-alpine AS go-builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist
RUN go build -o server .

# Stage 3: Minimal runtime
FROM alpine:latest
WORKDIR /app
COPY --from=go-builder /app/server .
EXPOSE 8080
CMD ["./server"]
```

### 7. Output Confirmation
After writing all files, print:
> "Backend code generated in backend/. Handoff to @qa for audit."
