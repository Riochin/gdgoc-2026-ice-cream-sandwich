# レストラン検索 AI コンシェルジュ

自然言語でレストランを探せる Web アプリです。「渋谷、静かなイタリアン、Wi-Fi あり」のように話しかけると、AI エージェントが Google Maps を検索して候補を提示します。

## アーキテクチャ

```
ブラウザ (React 19 SPA)
    │  POST /api/chat
    ▼
Go バックエンド (Echo v4)
    ├── handler/chat.go        リクエスト受付
    └── agent/agent.go         ADK エージェント実行
            │
            ├── mcp/maps.go    Google Places Text Search API
            │                  Google Routes API
            └── Gemini 2.5 Flash (ADK 経由 / 直接フォールバック)
```

フロントエンドのビルド成果物は Go バイナリに埋め込まれるため、本番は単一バイナリで動作します。

## 技術スタック

| 層 | 技術 |
|---|---|
| フロントエンド | React 19 + TypeScript + Vite 8 + Tailwind CSS v4 |
| バックエンド | Go 1.25 + Echo v4 |
| AI エージェント | Google ADK (Agent Development Kit) + Gemini 2.5 Flash |
| 外部 API | Google Places Text Search API、Google Routes API |
| デプロイ | Docker (multi-stage) / GCP Cloud Run |

## 必要なもの

- Go 1.25+
- Node 20+
- Gemini API キー（[Google AI Studio](https://aistudio.google.com/) で取得）
- Google Maps API キー（Places API + Routes API を有効化）

## セットアップ

```bash
git clone <this-repo>
cd gdgoc-2026-ice-cream-sandwich

# バックエンドの環境変数を設定
cp backend/.env.example backend/.env
# backend/.env を編集して API キーを記入
```

## 起動方法

### 開発

```bash
# ターミナル 1 — フロントエンド (http://localhost:5173)
cd frontend
npm install
npm run dev

# ターミナル 2 — バックエンド (http://localhost:8080)
cd backend
go run ./main.go
```

Vite の dev サーバーは `/api/*` を `localhost:8080` にプロキシするため、フロントエンドは `localhost:5173` を開けばそのまま動作します。

### 本番ビルド（シングルバイナリ）

```bash
make build-all   # frontend をビルドして Go バイナリに埋め込む
./server         # http://localhost:8080
```

### Docker

```bash
make docker-build

docker run -p 8080:8080 \
  -e GEMINI_API_KEY=your-key \
  -e GOOGLE_MAPS_API_KEY=your-key \
  gdgoc-ice-cream-sandwich
```

## 環境変数

| 変数 | 説明 | 必須 |
|---|---|---|
| `GEMINI_API_KEY` | Gemini API キー | ○ |
| `GOOGLE_MAPS_API_KEY` | Places / Routes API キー | ○ |
| `PORT` | サーバーポート（デフォルト: `8080`） | - |

## API

### POST /api/chat

チャットメッセージを送信してエージェントの返答を受け取ります。

**リクエスト**

```json
{
  "session_id": "demo-session-1",
  "message": "渋谷でランチできる静かなイタリアンを探して",
  "history": [
    { "role": "user",      "content": "こんにちは" },
    { "role": "assistant", "content": "こんにちは！どのようなお店をお探しですか？" }
  ]
}
```

**レスポンス**

```json
{
  "reply": "渋谷のイタリアン候補を 3 件見つけました。...",
  "metadata": {
    "used_tools": ["search_places"]
  }
}
```

## ディレクトリ構成

```
.
├── backend/
│   ├── main.go              Echo サーバー起動・SPA ルーティング
│   ├── handler/
│   │   └── chat.go          POST /api/chat ハンドラ
│   ├── agent/
│   │   ├── agent.go         ADK エージェント + Gemini フォールバック
│   │   └── prompt.go        システムプロンプト
│   ├── mcp/
│   │   └── maps.go          Google Places / Routes API ラッパー
│   ├── frontend/dist/       フロントエンドビルド成果物（Go に埋め込み）
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.tsx          チャット UI
│   │   ├── hooks/useChat.ts チャット状態管理
│   │   └── lib/api.ts       /api/chat クライアント
│   └── vite.config.ts
└── Makefile
```

## エージェントの動作

1. ユーザーのメッセージと会話履歴を ADK エージェントに渡す
2. エージェントは `search_places`（Google Places）または `compute_routes`（Google Routes）ツールを必要に応じて呼び出す
3. ADK が失敗した場合、Gemini + Google Search グラウンディングに自動フォールバック
4. 最終的なテキスト応答と使用ツール一覧をフロントエンドに返す
