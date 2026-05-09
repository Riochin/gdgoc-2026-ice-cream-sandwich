.PHONY: dev-frontend build-frontend dev-backend build-backend build-all docker-build docker-run run

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
	cd backend && go run .

build-backend:
	@echo "Building backend..."
	cd backend && go build -o server .

# 全体ビルド (フロントエンド -> バックエンド の順で embed.FS 用にビルド)
build-all: build-frontend
	@echo "Building full application..."
	cd backend && go build -o ../server .

# Docker 関連 (ルート Dockerfile が frontend/backend を一括ビルド。GCP --source . と互換)
docker-build:
	@echo "Building Docker image..."
	docker build -t gdgoc-ice-cream-sandwich .

docker-run:
	docker run --rm -p 8080:8080 gdgoc-ice-cream-sandwich

# Docker Compose
up:
	docker compose up --build

up-d:
	docker compose up -d --build

down:
	docker compose down

logs:
	docker compose logs -f

run:
	@echo "Running full app locally from Go binary..."
	./server
