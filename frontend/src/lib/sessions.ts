import { type Message } from './api';

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'chat-sessions-v1';
const MAX_TITLE_LEN = 24;
const WELCOME: Message = {
  role: 'assistant',
  content: 'こんにちは！探したいレストランの条件を教えてください。',
};

interface PersistedState {
  sessions: ChatSession[];
  currentId: string;
}

export function newSessionId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createEmptySession(): ChatSession {
  const now = Date.now();
  return {
    id: newSessionId(),
    title: '新しい検索',
    messages: [WELCOME],
    createdAt: now,
    updatedAt: now,
  };
}

export function deriveTitle(messages: Message[]): string {
  const firstUser = messages.find((m) => m.role === 'user');
  if (!firstUser) return '新しい検索';
  const trimmed = firstUser.content.trim().replace(/\s+/g, ' ');
  return trimmed.length > MAX_TITLE_LEN
    ? `${trimmed.slice(0, MAX_TITLE_LEN)}…`
    : trimmed;
}

export function loadState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) throw new Error('empty');
    const parsed = JSON.parse(raw) as PersistedState;
    if (!Array.isArray(parsed.sessions) || parsed.sessions.length === 0) {
      throw new Error('invalid');
    }
    if (!parsed.sessions.some((s) => s.id === parsed.currentId)) {
      parsed.currentId = parsed.sessions[0].id;
    }
    return parsed;
  } catch {
    const session = createEmptySession();
    return { sessions: [session], currentId: session.id };
  }
}

export function saveState(state: PersistedState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage unavailable / quota; ignore for now.
  }
}
