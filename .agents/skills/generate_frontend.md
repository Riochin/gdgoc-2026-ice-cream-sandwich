# Skill: Generate Frontend

## Purpose
Generate the complete React SPA under `app_build/frontend/` based on `production_artifacts/Technical_Specification.md`.

## Pre-condition
`production_artifacts/Technical_Specification.md` must exist and be approved.

## Steps

### 1. Read the Spec
Read `production_artifacts/Technical_Specification.md` in full before writing any code.

### 2. Scaffold Directory Structure

```
app_build/frontend/
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── index.html
├── firebase.json        # Firebase Hosting 設定
├── .firebaserc          # Firebase project 設定
├── .env.example         # VITE_API_BASE_URL=http://localhost:8080
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── api/
    │   ├── chat.ts      # POST /api/chat
    │   └── stream.ts    # SSE /api/chat/stream
    ├── components/
    │   ├── ChatWindow.tsx        # 会話ログ + 入力欄
    │   ├── MessageBubble.tsx     # ユーザー/エージェントの吹き出し
    │   ├── RestaurantPanel.tsx   # 検索結果カード一覧（右ペイン）
    │   ├── RestaurantCard.tsx    # 店舗カード（店名, 評価, 住所, タグ, 理由）
    │   └── LoadingIndicator.tsx  # 送信中スピナー
    ├── hooks/
    │   ├── useChat.ts            # チャット状態管理
    │   └── useSSE.ts             # SSEストリーム管理
    └── types/
        └── index.ts              # ChatMessage, Restaurant, APIResponse etc.
```

### 3. Implement Each File

#### src/types/index.ts
Define TypeScript interfaces matching the backend API:
```ts
export interface ChatMessage { role: 'user' | 'assistant'; content: string }
export interface ChatRequest { session_id: string; message: string; history: ChatMessage[] }
export interface ChatResponse { reply: string; metadata: { used_tools: string[] } }
export interface Restaurant { id: string; name: string; rating: number; address: string; lat: number; lng: number; url: string }
```

#### src/api/chat.ts
- `sendMessage(req: ChatRequest): Promise<ChatResponse>` — fetch POST `/api/chat`.

#### src/api/stream.ts（オプション — バックエンドがSSEを実装した場合のみ）
- `streamMessage(req: ChatRequest, onDelta, onFinal, onError)` — open `EventSource` to `GET /api/chat/stream`.
- Handle events: `message.delta`, `final`, `error`（最低限この3種）.
- Implement exponential backoff reconnect on disconnect.
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

### 5. Write firebase.json
```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{ "source": "**", "destination": "/index.html" }]
  }
}
```

### 6. Output Confirmation
After writing all files, print:
> "Frontend code generated in app_build/frontend/. Handoff to @qa for audit."
