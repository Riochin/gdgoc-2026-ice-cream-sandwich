import { useState, useCallback } from 'react';
import { Message, sendChatMessage } from '../lib/api';

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'こんにちは！探したいレストランの条件を教えてください。' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // セッションIDはハッカソン用として固定値を使いますが、
  // 拡張する場合はランダムなUUID等を生成してください。
  const sessionId = 'demo-session-1';

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = { role: 'user', content: text };
    const newHistory = [...messages, userMessage];
    
    // UIを即時更新
    setMessages(newHistory);
    setIsLoading(true);
    setError(null);

    try {
      const response = await sendChatMessage({
        session_id: sessionId,
        message: text,
        history: messages, // ユーザーの今のメッセージは除いた履歴を送る（仕様次第ですが、新しいメッセージは別プロパティなため）
      });

      // アシスタントからの返答を履歴に追加
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: response.reply }
      ]);
    } catch (err) {
      console.error('Chat Error:', err);
      setError('通信エラーが発生しました。もう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  }, [messages, sessionId]);

  return {
    messages,
    isLoading,
    error,
    sendMessage
  };
}
