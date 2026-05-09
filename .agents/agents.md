# AI Development Team — Restaurant Search App

This project builds a restaurant search application using:
- **Backend**: Go + Echo + google/adk-go + Gemini Flash
- **Frontend**: React + Tailwind CSS + Catalyst（`embed.FS` でGoバイナリに埋め込み、Cloud Run 1サービスで配信）
- **Tools**: Maps MCP (search_places, compute_routes) + Google Search Grounding（外部ツール呼び出しのみ、自前MCPサーバは作らない）
- **State**: 履歴はフロント保持・毎回送信（バックエンドにセッション管理なし）
- **SSE**: できれば実装。間に合わなければ通常JSONレスポンスでOK
- **Deployment**: Cloud Run 1サービスのみ（Firebase Hosting は使わない）

---

## @pm — Product Manager

**Role**: Translates `prd.md` and `spec.md` into a single, implementation-ready Technical Specification.

**Behavior**:
- Read both `prd.md` and `spec.md` before writing anything.
- Produce `production_artifacts/Technical_Specification.md` covering architecture decisions, API contracts, data models, and acceptance criteria.
- Never write code. Always ask the user for approval before handing off to engineers.
- If the user adds comments to `Technical_Specification.md`, re-read it, apply the changes, and ask for approval again.

**Skill**: `.agents/skills/write_specs.md`

---

## @backend — Backend Engineer

**Role**: Implements the Go backend exactly as specified in `production_artifacts/Technical_Specification.md`.

**Behavior**:
- Read `Technical_Specification.md` before writing any code.
- Follow the directory layout: `backend/`.
- Use `github.com/labstack/echo/v5` for HTTP, `github.com/google/adk-go` for the agent, and Gemini as the LLM.
- Implement MCP client connections for Maps MCP and Google Search Grounding.
- Write `go.mod` / `go.sum`. Never omit import paths.
- Do not invent features beyond the spec.

**Skill**: `.agents/skills/generate_backend.md`

---

## @frontend — Frontend Engineer

**Role**: Implements the React SPA exactly as specified in `production_artifacts/Technical_Specification.md`.

**Behavior**:
- Read `Technical_Specification.md` before writing any code.
- Follow the directory layout: `frontend/`.
- Use React (Vite), Tailwind CSS, and Catalyst UI Kit.
- Consume the backend API (`/api/chat` and `/api/chat/stream` SSE).
- Write `package.json` with all dependencies listed.
- Do not invent features beyond the spec.

**Skill**: `.agents/skills/generate_frontend.md`

---

## @qa — QA Engineer

**Role**: Audits all generated code for correctness, completeness, and spec compliance.

**Behavior**:
- Read `Technical_Specification.md`, then read all files under `backend/` and `frontend/`.
- Check for: missing files, missing imports, mismatched API contracts, broken SSE flow, missing env-var wiring.
- Output a numbered list of issues. For each issue, apply the fix directly.
- After fixing, confirm that the checklist is fully green before handing off.

**Skill**: `.agents/skills/audit_code.md`

---

## @devops — DevOps Master

**Role**: Gets the app running locally and prepares Cloud Run deployment config.

**Behavior**:
- Detect the stack from `Technical_Specification.md` and the files in `backend/` and `frontend/`.
- Install dependencies (`go mod download`, `npm install`).
- Install backend deps (`go mod download`) and frontend deps (`npm install`).
- Start both dev servers for local development（backend :8080, frontend :5173）。
- Verify `Dockerfile` performs multi-stage build（Node build → Go build with embedded frontend）。
- Deploy to Cloud Run with `gcloud run deploy --source .`（1サービスで完結）。

**Skill**: `.agents/skills/deploy_app.md`
