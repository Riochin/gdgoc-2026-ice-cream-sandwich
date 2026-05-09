# Stage 1: Build React frontend.
# vite.config.ts has outDir: '../backend/frontend/dist', so the bundle
# lands at /build/backend/frontend/dist after `npm run build`.
FROM node:20-alpine AS frontend-builder
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json* ./frontend/
RUN cd frontend && npm ci
COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# Stage 2: Build Go binary with embedded frontend.
FROM golang:1.25-alpine AS go-builder
WORKDIR /app
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ ./
COPY --from=frontend-builder /build/backend/frontend/dist ./frontend/dist
RUN CGO_ENABLED=0 go build -o server .

# Stage 3: Minimal runtime.
FROM alpine:3.20
RUN apk add --no-cache ca-certificates
WORKDIR /app
COPY --from=go-builder /app/server .
EXPOSE 8080
CMD ["./server"]
