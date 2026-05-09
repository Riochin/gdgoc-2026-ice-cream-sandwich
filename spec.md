## 1. 概要

レストラン検索アプリのバックエンド仕様（ハッカソン版）。Go + ADK でチャットエージェントを実装し、Maps系 MCP と Web検索（Grounding）を呼び出して、自然言語の要望から店を提案する。

## 2. 技術スタック（最小）

- **言語**：Go（1.21+）
- **Webフレームワーク**：Echo（`github.com/labstack/echo/v5`）
- **エージェントSDK**：`github.com/google/adk-go`
- **LLM**：Gemini（Vertex AI もしくは AI Studio。**Flashで十分**）
- **ツール（MCP / Grounding）**
    - Maps Grounding Lite MCP：`search_places` / `compute_routes`
    - Google Search Grounding：`google_search`
- **フロント**：React（SPA）+ Tailwind CSS + Catalyst
- **配信**：SSE（できれば。間に合わなければ通常JSONでOK）
- **インフラ**：**GCP / Cloud Run 中心**

## 3. システム構成（論理）

```
[React SPA] ──HTTP──▶ [Cloud Run: Go + Echo + ADK]
                          │
                          ├─▶ Vertex AI (Gemini)
                          ├─▶ Maps MCP (search_places / compute_routes)
                          └─▶ Google Search Grounding
```

- Backend は **Cloud Run 1サービスに集約**（自前のMCPサーバは作らない、外部ツールを呼ぶだけ）
- 履歴は **フロントに持たせて毎回送る**（最短実装）
- ストレージ・キャッシュ・認証は**MVPでは入れない**

## 4. デプロイ構成（GCP / 必要最小）

- **Cloud Run（Backend）**：Go コンテナを1つデプロイ
- **Vertex AI**：Gemini 呼び出し
- **Secret Manager**：APIキー類を保存し、Cloud Run のシークレット参照で注入
- **Artifact Registry + Cloud Build**：`gcloud run deploy --source .` でも可
- **リージョン**：`asia-northeast1`
- **フロント配信**：**Firebase Hosting**（最速）。間に合わなければローカル `npm run dev` でデモしてもOK

### Cloud Run 設定の最小ポイント

- `--allow-unauthenticated`（デモ用に公開）
- `--min-instances=0`（コスト優先。コールドスタートは許容）
- `--timeout=300`（SSE使うなら長めに）
- `--region=asia-northeast1`

## 5. API設計（MVP）

### 5.1 通常レスポンス

- `POST /api/chat`
- Request:

```json
{
  "session_id": "demo-1",
  "message": "渋谷の落ち着いたイタリアン",
  "history": [
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "..."}
  ]
}
```

- Response:

```json
{
  "reply": "...",
  "metadata": { "used_tools": ["search_places", "google_search"] }
}
```

### 5.2 SSE（できれば）

- `GET /api/chat/stream?session_id=...&message=...`
- イベント：`message.delta` / `final` / `error`（最低限）
- 間に合わなければ 5.1 だけで提出

## 6. エージェント設計（ADK）

### システムプロンプト案

```
あなたは優秀なレストラン案内コンシェルジュです。
ユーザーの要望に合わせて、以下のツールを駆使して最適なレストランを提案してください。

【利用可能なツール】
1. search_places (Maps MCP): 指定された条件の場所やレストランを検索します。
2. compute_routes (Maps MCP): 現在地や指定された場所からの経路・所要時間を計算します。
3. google_search (Search Grounding): 最新のメニュー情報、口コミ、評判、Webサイトの情報を検索します。

【行動指針】
- 要望が曖昧でも、推測してまず検索する。条件不足は1問だけ短く確認する。
- 店舗を提案する際は、店名、住所、簡単な特徴を含める。
- メニュー/詳細が求められたら google_search で最新情報を要約して伝える（Bonus）。
- 自然で丁寧な日本語で答える。
```

### ツール連携の最小フロー

1. 入力受領
2. `search_places` で候補取得
3. 必要なら `google_search` で詳細・メニュー補完
4. 上位3〜5件を理由付きで返却

## 7. 状態管理（最短）

- **MVP**：フロントが `history` を保持、毎回送信
- 余裕があれば Firestore に `sessions/{session_id}/messages/*` を保存（後付けで追加可能）

## 8. セキュリティ（ハッカソン最小）

- APIキーは **Secret Manager** に置き、Cloud Run のシークレット参照で読み込む（コミット禁止）
- CORS：Echo の `middleware.CORS()` でフロントドメインを許可
- 公開URLにする場合は、デモ用に簡易的な API Key ヘッダ確認を入れてもよい（任意）
- WAF / Cloud Armor / 監視は **やらない**（時間があれば）

## 9. デモ用の割り切り

- ログイン無し
- ユーザーごとの履歴永続化なし（フロントだけ）
- 多言語対応なし（日本語）
- エラー時はそのまま「検索に失敗しました、再試行してください」とだけ返す
- レイテンシは「動けばOK」

## 10. 開発スプリント（目安）

### Day 1

- Goプロジェクト雛形 + Echo `/api/chat` のスタブ
- Vertex AI（Gemini）疎通確認
- ADK で1ツール（`google_search`）から繋ぐ

### Day 2

- `search_places` 統合 + ツール呼び出しフローの確立
- フロントのチャットUI仮組み（Tailwind + Catalyst）
- Cloud Run へ初回デプロイ（`gcloud run deploy --source .`）

### Day 3

- 結果カードUI / 推薦理由表示
- （Bonus）`google_search` で店舗メニュー要約
- SSE化（余裕があれば）
- デモ動画 / プレゼン資料

## 11. MCPツール仕様（呼び出す側のメモ）

### search_places（Maps MCP）

- Input（例）：`location`, `keyword`, `open_now`, `price_level` ...
- Output（例）：`places[{id, name, rating, address, lat, lng, url}]`

### compute_routes（Maps MCP）

- Input：`origin`, `destination`, `travel_mode`
- Output：`route{duration, distance, polyline}`

### google_search（Search Grounding）

- Input：`query`
- Output：`results[{title, url, snippet}]`