# Skill: Write Technical Specification

## Purpose
Produce `production_artifacts/Technical_Specification.md` by merging `prd.md` (product requirements) and `spec.md` (technical design) into a single implementation-ready document.

## Steps

### 1. Read Source Documents
- Read `prd.md` in full.
- Read `spec.md` in full.
- Identify any gaps or conflicts between them.

### 2. Draft Technical_Specification.md

Write the document with the following sections:

```
# Technical Specification — Restaurant Search App（ハッカソン版）

## 1. Overview
(1-paragraph summary of what is being built and why)

## 2. Tech Stack
| Layer      | Technology                                         |
|------------|----------------------------------------------------|
| Language   | Go 1.21+                                           |
| HTTP       | github.com/labstack/echo/v5                        |
| Agent SDK  | github.com/google/adk-go                           |
| LLM        | Gemini Flash (Vertex AI / AI Studio)               |
| Tools      | Maps MCP (外部), Google Search Grounding (外部)   |
| Frontend   | React + Vite + Tailwind CSS + Catalyst             |
| Streaming  | SSE（できれば。間に合わなければ通常JSONでOK）       |
| Backend    | Cloud Run 1サービス（自前MCPサーバは作らない）     |
| Frontend   | Firebase Hosting（ローカルデモも可）               |
| Secrets    | Secret Manager → Cloud Run シークレット参照        |

## 3. Repository Layout
app_build/           ← Go module root（embed.FS でフロントを内包）
├── main.go          # //go:embed frontend/dist + Echo setup
├── go.mod
├── .env.example
├── Dockerfile       # multi-stage: Node build → Go build
├── handler/         # chat.go, stream.go
├── agent/           # agent.go, prompt.go
├── mcp/             # maps.go, search.go
└── frontend/        # React プロジェクト
    ├── package.json
    ├── .env.example # VITE_API_BASE_URL（ローカル開発時のみ使用）
    ├── dist/        # npm run build の出力（go:embed 対象）
    └── src/
        ├── App.tsx
        ├── api/
        └── components/

## 4. API Contracts
POST /api/chat
  Request:  { session_id, message, history: [{role, content}] }
  Response: { reply, metadata: { used_tools } }

GET /api/chat/stream  ← オプション
  イベント: message.delta / final / error

## 5. Agent Design
(spec.md §6 のシステムプロンプト全文を転記)
Tools: search_places, compute_routes, google_search
Fallback: 0件→条件緩和を提案、エラー→「検索に失敗しました、再試行してください」

## 6. Data Models
(Go structs: ChatRequest, ChatResponse, Place, Route, SearchResult)
(TypeScript interfaces: ChatMessage, ChatRequest, ChatResponse, Restaurant)

## 7. Environment Variables
Backend:
  GEMINI_API_KEY=
  MAPS_MCP_URL=
  SEARCH_MCP_URL=
  FRONTEND_ORIGIN=
  PORT=8080
Frontend:
  VITE_API_BASE_URL=http://localhost:8080

## 8. Deployment
Build:    cd app_build/frontend && npm run build  （dist/ を生成）
Deploy:   cd app_build && gcloud run deploy ice-cream-sandwich \
            --source . --region=asia-northeast1 \
            --allow-unauthenticated --min-instances=0 --timeout=300
Secrets:  gcloud secrets create ... → Cloud Run --set-secrets で注入
Note:     フロントは embed.FS でGoバイナリに同梱。Firebase / 別サービス不要。

## 9. Acceptance Criteria
(Numbered list of testable statements that define "done")

## 10. Development Sprint（目安）
Day 1: Go雛形 + /api/chat スタブ + Gemini疎通 + google_search 1ツール接続
Day 2: search_places 統合 + フロントUI仮組み + Cloud Run 初回デプロイ
Day 3: 結果カードUI + Bonus(menu) + SSE化（余裕あれば） + デモ準備
```

### 3. Save Output
Save the completed document to `production_artifacts/Technical_Specification.md`.

### 4. Halt and Ask for Approval
Print:
> "Technical_Specification.md has been written. Please review it. Add inline comments for any changes, then say 'Approved' to proceed."

Do not continue until the user explicitly says "Approved" or an equivalent.

### 5. Revision Loop
If the user adds comments to `Technical_Specification.md`:
1. Re-read the file.
2. Apply all requested changes.
3. Overwrite `production_artifacts/Technical_Specification.md`.
4. Return to Step 4.
