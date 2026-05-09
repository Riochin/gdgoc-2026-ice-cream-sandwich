# Skill: Audit Code

## Purpose
Validate all generated code in `app_build/` against `production_artifacts/Technical_Specification.md` and fix any issues found.

## Steps

### 1. Read the Spec
Read `production_artifacts/Technical_Specification.md` in full.

### 2. Read All Generated Code
Read every file under `app_build/` (backend Go files + `frontend/src/`).

### 3. Run the Checklist

For each item below, mark ✅ (pass), ❌ (fail with description), or ⏭️ (skipped optional):

#### Backend Checklist
- [ ] `go.mod` exists at `app_build/go.mod` with correct module path
- [ ] All imported packages are listed in `go.mod`
- [ ] `main.go` has `//go:embed frontend/dist` directive
- [ ] `main.go` serves `frontend/dist` via `echo.StaticFS` or equivalent
- [ ] `main.go` has SPA fallback（未知パスを `index.html` へルーティング）
- [ ] `POST /api/chat` handler matches the request/response schema in the spec
- [ ] `handler/chat.go` does NOT store history in backend memory（フロントから受け取るだけ）
- [ ] Error response returns `{"reply": "検索に失敗しました、再試行してください"}` on failure
- [ ] ADK agent uses Gemini Flash and the correct system prompt from spec §6
- [ ] All three MCP tools are registered: `search_places`, `compute_routes`, `google_search`
- [ ] No API keys or secrets are hardcoded
- [ ] `Dockerfile` exists with multi-stage build（Stage1: Node build, Stage2: Go build + COPY dist, Stage3: runtime）
- [ ] **[Optional]** SSE endpoint sends `message.delta`, `final`, `error` events

#### Frontend Checklist
- [ ] `package.json` exists at `app_build/frontend/package.json` with all dependencies
- [ ] `vite.config.ts` has `base: './'`（embed.FS での相対パス解決）
- [ ] `vite.config.ts` has `/api` proxy to `http://localhost:8080`（ローカル開発用）
- [ ] API calls use `/api/chat`（絶対 URL や `VITE_API_BASE_URL` に依存しない）
- [ ] `POST /api/chat` request shape: `{session_id, message, history}`
- [ ] Input field is always enabled (not disabled while loading)
- [ ] Error state shows a retry button
- [ ] Two-pane layout (Chat + Results) exists in `App.tsx`
- [ ] Mobile tab switcher exists
- [ ] `firebase.json` / `.firebaserc` が存在しないこと（不要なので削除）
- [ ] **[Optional]** SSE client handles `message.delta`, `final`, `error` events

### 4. Fix All Issues
For every ❌ item, edit the relevant file(s) to fix the problem. Re-check after fixing.
Optional items（[Optional]）は、バックエンドがSSEを実装していない場合はスキップ可。

### 5. Output Audit Report
Print the completed checklist with all items marked ✅ / ⏭️, then:
> "Audit complete. All checks passed. Handoff to @devops for deployment."
