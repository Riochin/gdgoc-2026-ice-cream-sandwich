# Skill: Deploy App

## Purpose
Install dependencies, start local dev servers, and deploy to Cloud Run as a single service.
フロントは `embed.FS` でGoバイナリに同梱されるため、Firebase Hosting など別サービスは不要。

## Steps

### 1. Detect Stack
Read `production_artifacts/Technical_Specification.md` to confirm:
- `app_build/` — Go module root（embed.FS でフロントを内包）
- `app_build/frontend/` — React プロジェクト

---

## Local Development（開発時は分離して起動）

### 2. Start Backend Dev Server（port 8080）
```bash
cd app_build
cp .env.example .env   # 初回のみ。GEMINI_API_KEY等を記入
go run main.go
```
> ローカルでは `frontend/dist/` が未ビルドでも起動可能。APIのみ確認する場合はこれで十分。

### 3. Start Frontend Dev Server（port 5173）
```bash
cd app_build/frontend
npm install
npm run dev
```
Vite の proxy 設定（`/api` → `http://localhost:8080`）により、バックエンドと連携できる。

Report:
> "Backend API: http://localhost:8080 | Frontend Dev: http://localhost:5173"

---

## Production Build & Deploy

### 4. Build Frontend（dist/ を生成）
```bash
cd app_build/frontend
npm install
npm run build
# → app_build/frontend/dist/ が生成される（go:embed の対象）
```

### 5. Deploy to Cloud Run（1コマンド）
`Dockerfile` が `app_build/` に存在することを確認してから実行。

```bash
cd app_build
gcloud run deploy ice-cream-sandwich \
  --source . \
  --region=asia-northeast1 \
  --allow-unauthenticated \
  --min-instances=0 \
  --timeout=300 \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest,MAPS_MCP_URL=MAPS_MCP_URL:latest,SEARCH_MCP_URL=SEARCH_MCP_URL:latest"
```

> `--source .` で `Dockerfile` が自動検出され、multi-stage build が実行される。
> フロントの dist/ は Dockerfile 内の Node ビルドステージで生成・コピーされる。

### 6. Verify Dockerfile（multi-stage）
`app_build/Dockerfile` が以下の構成になっていることを確認。なければ生成する。

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
> "Local dev servers started.
> - API:      http://localhost:8080
> - Frontend: http://localhost:5173
>
> To deploy to Cloud Run（1サービスで完結）:
>   1. cd app_build/frontend && npm run build
>   2. cd app_build && gcloud run deploy ice-cream-sandwich --source . --region=asia-northeast1 --set-secrets=..."
