/**
 * チャットの履歴を構成するメッセージの型定義
 */
export interface Message {
  role: 'user' | 'assistant';
  content: string;
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
  };
}

/**
 * バックエンドのチャットAPIを呼び出し、AIエージェントからの応答を取得します。
 * 
 * @param request 送信するメッセージと履歴、セッションIDを含むリクエストオブジェクト
 * @returns バックエンドからの応答（テキストとメタデータ）
 * @throws ネットワークエラーやサーバーエラーが発生した場合に例外をスローします
 */
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
