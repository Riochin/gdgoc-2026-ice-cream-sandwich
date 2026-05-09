# Skill: Generate Frontend

## Purpose
Generate the complete React SPA under `app_build/frontend/` based on `production_artifacts/Technical_Specification.md`.
本番は Go の `embed.FS` でバイナリに同梱されるため、Firebase Hosting は使わない。

## Pre-condition
`production_artifacts/Technical_Specification.md` must exist and be approved.

## Steps

### 1. Read the Spec
Read `production_artifacts/Technical_Specification.md` in full before writing any code.

### 2. Scaffold Directory Structure

```
app_build/frontend/
├── package.json
├── vite.config.ts   # base: './' に設定（embed.FS での相対パス対応）
├── tailwind.config.ts
├── tsconfig.json
├── index.html
├── .env.example     # VITE_API_BASE_URL=http://localhost:8080（ローカル開発時のみ）
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── api/
    │   ├── chat.ts      # POST /api/chat
    │   └── stream.ts    # SSE /api/chat/stream（オプション）
    ├── components/
    │   ├── ChatWindow.tsx        # 会話ログ + 入力欄
    │   ├── MessageBubble.tsx     # ユーザー/エージェントの吹き出し
    │   ├── RestaurantPanel.tsx   # 検索結果カード一覧（右ペイン）
    │   ├── RestaurantCard.tsx    # 店舗カード（店名, 評価, 住所, タグ, 理由）
    │   └── LoadingIndicator.tsx  # 送信中スピナー
    ├── hooks/
    │   ├── useChat.ts            # チャット状態管理
    │   └── useSSE.ts             # SSEストリーム管理（オプション）
    └── types/
        └── index.ts              # ChatMessage, Restaurant, APIResponse etc.
```

> `dist/` は `npm run build` で生成される。Go の `embed.FS` がこれを内包する。
> `firebase.json` / `.firebaserc` は不要。

### 3. Implement Each File

#### vite.config.ts
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',   // embed.FS での相対パス解決に必要
  server: {
    proxy: {
      '/api': 'http://localhost:8080',  // ローカル開発時にバックエンドへプロキシ
    },
  },
})
```

#### src/types/index.ts
```ts
export interface ChatMessage { role: 'user' | 'assistant'; content: string }
export interface ChatRequest { session_id: string; message: string; history: ChatMessage[] }
export interface ChatResponse { reply: string; metadata: { used_tools: string[] } }
export interface Restaurant { id: string; name: string; rating: number; address: string; lat: number; lng: number; url: string }
```

#### src/api/chat.ts
- `sendMessage(req: ChatRequest): Promise<ChatResponse>` — fetch POST `/api/chat`.
- 本番は同一オリジン（`/api/chat`）。ローカルは vite proxy 経由。`VITE_API_BASE_URL` は不要。

#### src/api/stream.ts（オプション — バックエンドがSSEを実装した場合のみ）
- `streamMessage(req: ChatRequest, onDelta, onFinal, onError)` — open `EventSource` to `GET /api/chat/stream`.
- Handle events: `message.delta`, `final`, `error`.
- SSEを使わない場合は `chat.ts` の `sendMessage` のみで対応する。

#### src/hooks/useChat.ts
- State: `messages: ChatMessage[]`, `restaurants: Restaurant[]`, `isLoading: boolean`.
- `sendMessage(text: string)` — appends user message, calls API, appends assistant reply.
- Extracts restaurant data from reply if present.

#### src/App.tsx
- Two-pane layout: `<ChatWindow>` (left) + `<RestaurantPanel>` (right).
- Mobile: tab switcher between Chat and Results tabs.

#### src/components/ChatWindow.tsx
- Render message history with `<MessageBubble>`.
- Input field always active (even while loading).
- `<LoadingIndicator>` shown during API call.
- Error state with retry button.

#### src/components/RestaurantCard.tsx
- Display: name, star rating, price range, address, tags, recommendation reason.
- Link to Google Maps URL.

### 4. package.json
```json
{
  "name": "ice-cream-sandwich-frontend",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.0.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0"
  }
}
```

### 5. Write .env.example
```
# ローカル開発時のみ参照（本番は同一オリジンのため不要）
VITE_API_BASE_URL=http://localhost:8080
```

### 6. Output Confirmation
After writing all files, print:
> "Frontend code generated in app_build/frontend/. Handoff to @qa for audit."
