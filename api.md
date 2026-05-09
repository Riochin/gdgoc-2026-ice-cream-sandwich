# API Documentation

このドキュメントは、フロントエンドとバックエンド間で通信するためのAPI仕様を定義します。

## POST `/api/chat`

ユーザーからのチャットメッセージを受け取り、AIエージェントからの応答を返します。

### リクエスト (Request)

- **Content-Type**: `application/json`

```json
{
  "session_id": "string",
  "message": "string",
  "history": [
    {
      "role": "user" | "assistant",
      "content": "string"
    }
  ]
}
```

- `session_id`: チャットセッションを一意に識別するためのID
- `message`: 今回ユーザーが送信した新しいメッセージ
- `history`: 過去の会話履歴。今回送信した `message` は含まれません。

### レスポンス (Response)

- **Content-Type**: `application/json`

**成功時 (200 OK):**
```json
{
  "reply": "string",
  "metadata": {
    "used_tools": ["string"]
  }
}
```

- `reply`: AIエージェントからのテキスト応答。Markdown形式をサポートします。
- `metadata.used_tools` (任意): エージェントが応答を生成する際に利用したツール名（例: `["google_maps", "tabelog_search"]`）。

**エラー時 (400 Bad Request / 500 Internal Server Error):**
ステータスコードに沿った適切なエラーメッセージを返すか、標準のエラーレスポンス形式を採用してください。
