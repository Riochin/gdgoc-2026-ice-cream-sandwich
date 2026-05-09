## 1. 概要

本ドキュメントは、レストラン検索アプリケーションの**バックエンド**に関する詳細仕様を定義する。Go言語および `github.com/google/adk-go` を採用し、ユーザーからの自然言語入力を解釈して、自律的に外部ツール（MCP）を実行するAIエージェントを構築する。

## 2. アーキテクチャと技術スタック

### 2.1 技術スタック

- **言語**: Go（1.21+ 推奨）
- **フレームワーク**: Echo（`github.com/labstack/echo/v5`）
- **エージェント開発キット**: `github.com/google/adk-go`（Google Agent Development Kit）
- **LLM**: Gemini（例：Pro / Flash。Vertex AI または AI Studio 経由）
- **連携ツール（MCP）**
    - Maps Grounding Lite MCP（例：`search_places`, `compute_routes`）
    - Google Search Grounding（Web検索用。例：`google_search`）
- **フロントエンド**: React（SPA）
- **UI**: Tailwind CSS + Catalyst（UI Kit）
- **配信**: SSE（Server-Sent Events）
- **ホスティング**: Google Cloud Run

### 2.2 システムコンポーネント図（論理）

```
[Echo Handler] <---(JSON)---> [React Frontend]
      │
      ▼
[Agent Manager] (セッション/履歴管理)
      │
      ▼
[ADK Agent (Gemini)] <===(Tool Calls)===> [MCP Clients]
                                                │
                                                ├─▶ Maps MCP (Places, Routes)
                                                └─▶ Search Grounding
```

### 2.3 通信の流れ（概要）

1. フロントがユーザー入力を Backend（Echo）へ送信
2. Backend が `session_id` をもとに履歴を解決し、ADK エージェント実行を開始
3. ADK が必要に応じて MCP 経由でツールを呼び出し（Places/Routes/Search 等）
4. 生成結果をフロントへ返却（通常JSON / もしくは SSE ストリーミング）
5. フロントは会話ログと結果パネルを更新

## 3. APIインターフェース設計

フロントエンド（チャットUI）との通信インターフェース。

### 3.1 チャット（通常レスポンス）

- **パス**: `POST /api/chat`
- **概要**: ユーザーからのメッセージを受け取り、エージェントの推論結果を返す
- **リクエスト（JSON）**

```json
{
  "session_id": "user-session-12345",
  "message": "渋谷の落ち着いたイタリアンを探して",
  "history": [
    {"role": "user", "content": "こんにちは"},
    {"role": "assistant", "content": "ご用件は？"}
  ]
}
```

- **レスポンス（JSON）**

```json
{
  "reply": "渋谷で落ち着いた雰囲気のイタリアンですね。以下の3件が見つかりました...\n\n1. トラットリア〇〇\n...",
  "metadata": {
    "used_tools": ["search_places", "google_search"]
  }
}
```

### 3.2 チャット（SSEストリーミング）

- **パス（例）**: `GET /api/chat/stream`
- **目的**: 応答生成をストリーミングし、体感速度を上げる
- **イベント種別（例）**
    - `message.delta`：生成途中のテキスト差分
    - `tool.call` / `tool.result`：デバッグ用（本番UIは非表示でも可）
    - `final`：完了
    - `error`：エラー
- **再接続**: 切断時はクライアント側でリトライ（指数バックオフ）

## 4. エージェント設計（ADK）

### 4.1 システムプロンプト（指示書）案

```
あなたは優秀なレストラン案内コンシェルジュです。
ユーザーの要望に合わせて、以下のツールを駆使して最適なレストランを提案してください。

【利用可能なツール】
1. search_places (Maps MCP): 指定された条件の場所やレストランを検索します。
2. compute_routes (Maps MCP): 現在地や指定された場所からの経路・所要時間を計算します。
3. google_search (Search Grounding): 最新のメニュー情報、口コミ、評判、Webサイトの情報を検索します。

【行動指針】
- ユーザーの要望が曖昧な場合は、推測して検索するか、必要な条件（エリアや予算など）を優しく質問してください。
- 店舗を提案する際は、店名、住所、簡単な特徴（口コミやメニュー情報など）を含めてください。
- ボーナス課題への対応：特定の店舗について聞かれたり、メニューや詳細が求められた場合は、必ず Google Search ツールを使用して最新の情報を取得し、要約して伝えてください。
- 回答は自然で丁寧な日本語で行ってください。
```

### 4.2 ツール連携フロー（例）

1. ユーザーが「新宿の辛いラーメン」と入力
2. ADKエージェント（Gemini）が入力を解析
3. Gemini が `search_places` の呼び出しを要求（例：location="新宿", keyword="辛いラーメン"）
4. Goバックエンドが Maps MCP に対してリクエストを実行し、結果を Gemini に返す
5. Gemini が追加で `google_search` を要求（例：query="新宿 〇〇ラーメン 辛さ メニュー"）
6. Goバックエンドが検索結果を Gemini に返す
7. Gemini が最終回答を生成し、フロントへ返却

## 5. 状態管理（セッション / 履歴）

LLMは状態を持たないため、文脈を維持したチャットを行うには過去の会話履歴を扱う必要がある。

- **案A**: フロント側で履歴を保持し、毎回 `/api/chat` に送信（実装がシンプル）
- **案B**: Goバックエンド側（インメモリ / Redis / Firestore 等）で `session_id` に紐づけて履歴を管理

## 6. セキュリティと運用

- **CORS**: Echo のミドルウェア（`middleware.CORS`）でフロントエンドのドメインを許可
- **環境変数 / Secrets**: Vertex AI / Maps / MCP 接続情報などは Secret Manager 等で管理し、ハードコードしない
- **レートリミット**: Echo のミドルウェア（`middleware.RateLimiter` 等）で同一IPからの過剰リクエストを抑止
- **ログ**: 会話入力、抽出条件、ツール呼び出し/結果、失敗理由を保存（デバッグ/改善用）

## 7. MCPツール仕様（案）

### search_places（Maps MCP）

- Input（例）: `location`, `keyword`, `open_now`, `price_level` ...
- Output（例）: places[{id, name, rating, address, lat, lng, url}]

### compute_routes（Maps MCP）

- Input（例）: `origin`, `destination`, `travel_mode`
- Output（例）: route{duration, distance, polyline}

### google_search（Search Grounding）

- Input（例）: `query`
- Output（例）: results[{title, url, snippet}]