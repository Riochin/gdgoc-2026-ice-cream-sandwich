.PHONY: dev-frontend build-frontend dev-backend build-backend docker-build run

# フロントエンド関連
dev-frontend:
	@echo "Starting frontend dev server..."
	cd frontend && npm run dev

build-frontend:
	@echo "Building frontend..."
	cd frontend && npm run build

# バックエンド関連
dev-backend:
	@echo "Starting backend dev server..."
	cd backend && go run ./cmd/server

build-backend:
	@echo "Building backend..."
	cd backend && go build -o server ./cmd/server

# 全体ビルド (フロントエンド -> バックエンド の順で embed.FS 用にビルド)
build-all: build-frontend
	@echo "Building full application..."
	cd backend && go build -o ../server ./cmd/server

# Docker 関連
docker-build: build-frontend
	@echo "Building Docker image..."
	docker build -t gdgoc-ice-cream-sandwich -f backend/Dockerfile backend/

run:
	@echo "Running full app locally from Go binary..."
	./server
