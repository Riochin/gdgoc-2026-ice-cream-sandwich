/**
 * チャットの履歴を構成するメッセージの型定義
 */
export interface Place {
  id: string;
  name: string;
  rating: number;
  address: string;
  lat: number;
  lng: number;
  url: string;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  /** Tools the agent invoked while producing this assistant message. */
  usedTools?: string[];
  /** Structured Places returned by search_places during this turn. */
  places?: Place[];
}

/**
 * /api/chat エンドポイントへ送信するリクエストの型定義
 */
export interface ChatRequest {
  session_id: string;
  message: string;
  history: Message[];
}

/**
 * /api/chat エンドポイントから返却されるレスポンスの型定義
 */
export interface ChatResponse {
  reply: string;
  metadata?: {
    used_tools?: string[];
    places?: Place[];
  };
}

/**
 * バックエンドのチャットAPIを呼び出し、AIエージェントからの応答を取得します。
 * 
 * @param request 送信するメッセージと履歴、セッションIDを含むリクエストオブジェクト
 * @returns バックエンドからの応答（テキストとメタデータ）
 * @throws ネットワークエラーやサーバーエラーが発生した場合に例外をスローします
 */
export interface StreamHandlers {
  onDelta: (text: string) => void;
  onDone: (meta: { used_tools?: string[]; places?: Place[] }) => void;
  onError?: (message: string) => void;
}

/**
 * Streams a chat reply from /api/chat/stream as Server-Sent Events.
 * Three event types are emitted by the server:
 *   delta:  { text }
 *   done:   { used_tools, places }
 *   error:  { message }
 */
export async function streamChatMessage(
  request: ChatRequest,
  handlers: StreamHandlers,
): Promise<void> {
  const response = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok || !response.body) {
    handlers.onError?.(`HTTP ${response.status} ${response.statusText}`);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let sep: number;
    while ((sep = buffer.indexOf('\n\n')) !== -1) {
      const rawEvent = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);

      let event = 'message';
      let data = '';
      for (const line of rawEvent.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) data += line.slice(5).trim();
      }
      if (!data) continue;

      try {
        const parsed = JSON.parse(data) as Record<string, unknown>;
        if (event === 'delta') {
          handlers.onDelta((parsed.text as string) ?? '');
        } else if (event === 'done') {
          handlers.onDone({
            used_tools: parsed.used_tools as string[] | undefined,
            places: parsed.places as Place[] | undefined,
          });
        } else if (event === 'error') {
          handlers.onError?.((parsed.message as string) ?? 'unknown error');
        }
      } catch {
        // skip malformed event
      }
    }
  }
}

export async function sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    // バックエンドはエラー時にも { reply: "..." } の JSON を返す
    let serverMessage: string | undefined;
    try {
      const body = (await response.json()) as Partial<ChatResponse>;
      serverMessage = body.reply;
    } catch {
      // ignore JSON parse failure
    }
    throw new Error(serverMessage ?? `チャットAPIの呼び出しに失敗しました: ${response.statusText}`);
  }

  return response.json() as Promise<ChatResponse>;
}
