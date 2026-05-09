import { useState, useCallback, useEffect, useMemo } from 'react';
import { type Message, sendChatMessage } from '../lib/api';
import {
  type ChatSession,
  createEmptySession,
  deriveTitle,
  loadState,
  saveState,
} from '../lib/sessions';

export function useChat() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentId, setCurrentId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hydrate from localStorage on mount.
  useEffect(() => {
    const initial = loadState();
    setSessions(initial.sessions);
    setCurrentId(initial.currentId);
  }, []);

  // Persist on change.
  useEffect(() => {
    if (sessions.length === 0 || !currentId) return;
    saveState({ sessions, currentId });
  }, [sessions, currentId]);

  const currentSession = useMemo(
    () => sessions.find((s) => s.id === currentId),
    [sessions, currentId],
  );
  const messages = currentSession?.messages ?? [];

  const newSession = useCallback(() => {
    const session = createEmptySession();
    setSessions((prev) => [session, ...prev]);
    setCurrentId(session.id);
    setError(null);
  }, []);

  const switchSession = useCallback((id: string) => {
    setCurrentId(id);
    setError(null);
  }, []);

  const deleteSession = useCallback((id: string) => {
    setSessions((prev) => {
      const remaining = prev.filter((s) => s.id !== id);
      if (remaining.length === 0) {
        const fresh = createEmptySession();
        setCurrentId(fresh.id);
        return [fresh];
      }
      setCurrentId((curr) => (curr === id ? remaining[0].id : curr));
      return remaining;
    });
    setError(null);
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || !currentId) return;

      const userMessage: Message = { role: 'user', content: text };
      const historyBeforeSend = messages;
      const optimisticMessages = [...historyBeforeSend, userMessage];

      // Optimistic UI update + title derivation.
      setSessions((prev) =>
        prev.map((s) =>
          s.id === currentId
            ? {
                ...s,
                messages: optimisticMessages,
                title: deriveTitle(optimisticMessages),
                updatedAt: Date.now(),
              }
            : s,
        ),
      );
      setIsLoading(true);
      setError(null);

      try {
        const response = await sendChatMessage({
          session_id: currentId,
          message: text,
          history: historyBeforeSend,
        });

        setSessions((prev) =>
          prev.map((s) =>
            s.id === currentId
              ? {
                  ...s,
                  messages: [
                    ...optimisticMessages,
                    {
                      role: 'assistant',
                      content: response.reply,
                      usedTools: response.metadata?.used_tools,
                      places: response.metadata?.places,
                    },
                  ],
                  updatedAt: Date.now(),
                }
              : s,
          ),
        );
      } catch (err) {
        console.error('Chat Error:', err);
        setError(err instanceof Error ? err.message : '通信エラーが発生しました。もう一度お試しください。');
      } finally {
        setIsLoading(false);
      }
    },
    [currentId, messages],
  );

  return {
    sessions,
    currentId,
    messages,
    isLoading,
    error,
    sendMessage,
    newSession,
    switchSession,
    deleteSession,
  };
}
