import { useState, useCallback, useEffect, useMemo } from 'react';
import { type Message, streamChatMessage } from '../lib/api';
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
      const placeholder: Message = { role: 'assistant', content: '' };
      const historyBeforeSend = messages;
      const withUser = [...historyBeforeSend, userMessage];
      const withPlaceholder = [...withUser, placeholder];

      // Optimistic UI update: user message + empty assistant slot to stream into.
      setSessions((prev) =>
        prev.map((s) =>
          s.id === currentId
            ? {
                ...s,
                messages: withPlaceholder,
                title: deriveTitle(withUser),
                updatedAt: Date.now(),
              }
            : s,
        ),
      );
      setIsLoading(true);
      setError(null);

      const patchAssistant = (mutator: (m: Message) => Message) => {
        setSessions((prev) =>
          prev.map((s) => {
            if (s.id !== currentId) return s;
            const msgs = s.messages.slice();
            const lastIdx = msgs.length - 1;
            if (lastIdx >= 0 && msgs[lastIdx].role === 'assistant') {
              msgs[lastIdx] = mutator(msgs[lastIdx]);
            }
            return { ...s, messages: msgs, updatedAt: Date.now() };
          }),
        );
      };

      let streamError: string | null = null;

      await streamChatMessage(
        {
          session_id: currentId,
          message: text,
          history: historyBeforeSend,
        },
        {
          onDelta: (chunk) => {
            patchAssistant((m) => ({ ...m, content: m.content + chunk }));
          },
          onDone: ({ used_tools, places }) => {
            patchAssistant((m) => ({ ...m, usedTools: used_tools, places }));
          },
          onError: (msg) => {
            streamError = msg;
          },
        },
      );

      if (streamError) {
        console.error('Chat stream error:', streamError);
        setError(streamError);
      }
      setIsLoading(false);
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
