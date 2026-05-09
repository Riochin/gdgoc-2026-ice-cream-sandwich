# Build stage
FROM golang:1.26-alpine AS builder

WORKDIR /app

# 依存関係のダウンロード（キャッシュを活用）
COPY go.mod go.sum ./
RUN go mod download

# ソースコードのコピー
COPY . .

# アプリケーションのビルド（CGO無効化で静的リンクされたバイナリを作成）
RUN CGO_ENABLED=0 GOOS=linux go build -o server ./cmd/server

# Final stage
FROM alpine:latest

# タイムゾーンデータやCA証明書などが必要な場合は追加
RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app

# ビルドしたバイナリをコピー
COPY --from=builder /app/server .

# Cloud Run はデフォルトで PORT 8080 を使用
ENV PORT=8080
EXPOSE 8080

# 実行
CMD ["./server"]
