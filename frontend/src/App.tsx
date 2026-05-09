import { useState, useRef, useEffect } from 'react';
import { useChat } from './hooks/useChat';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { SidebarLayout } from './components/ui/sidebar-layout';
import { Sidebar, SidebarHeader, SidebarBody, SidebarItem, SidebarLabel, SidebarSection, SidebarHeading } from './components/ui/sidebar';
import { Navbar, NavbarItem, NavbarSection, NavbarSpacer } from './components/ui/navbar';
import { Cog6ToothIcon, SparklesIcon, PlusIcon, ChatBubbleLeftIcon, XMarkIcon } from '@heroicons/react/20/solid';
import { RestaurantCards } from './components/RestaurantCards';

const TOOL_LABELS: Record<string, string> = {
  search_places: '🗺 場所検索',
  compute_routes: '🚶 経路',
  web_search: '🔎 Web検索',
  google_search: '🔎 Web検索',
};

export default function App() {
  const {
    sessions,
    currentId,
    messages,
    isLoading,
    error,
    sendMessage,
    newSession,
    switchSession,
    deleteSession,
  } = useChat();
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim() && !isLoading) {
      sendMessage(inputText);
      setInputText('');
    }
  };

  const sortedSessions = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);

  const nav = (
    <Navbar>
      <NavbarSpacer />
      <NavbarSection>
        <NavbarItem href="#">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-sm font-bold text-white shadow-sm">
            R
          </div>
        </NavbarItem>
      </NavbarSection>
    </Navbar>
  );

  const sidebar = (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 font-bold text-white shadow-sm">
            RC
          </div>
          <SidebarLabel className="font-semibold text-zinc-900 dark:text-white">Restaurant Concierge</SidebarLabel>
        </div>
      </SidebarHeader>
      <SidebarBody>
        <SidebarSection>
          <SidebarItem
            onClick={(e) => {
              e.preventDefault();
              newSession();
            }}
            href="#"
          >
            <PlusIcon />
            <SidebarLabel>新しい検索</SidebarLabel>
          </SidebarItem>
        </SidebarSection>

        {sortedSessions.length > 0 && (
          <SidebarSection>
            <SidebarHeading>最近の履歴</SidebarHeading>
            {sortedSessions.map((s) => (
              <div key={s.id} className="group relative">
                <SidebarItem
                  current={s.id === currentId}
                  onClick={(e) => {
                    e.preventDefault();
                    switchSession(s.id);
                  }}
                  href="#"
                >
                  <ChatBubbleLeftIcon />
                  <SidebarLabel className="pr-6">{s.title}</SidebarLabel>
                </SidebarItem>
                <button
                  type="button"
                  aria-label={`${s.title} を削除`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (window.confirm(`「${s.title}」を削除しますか？`)) {
                      deleteSession(s.id);
                    }
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-400 opacity-0 transition group-hover:opacity-100 hover:bg-zinc-950/10 hover:text-zinc-700 focus:opacity-100 dark:hover:bg-white/10 dark:hover:text-zinc-200"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </SidebarSection>
        )}

        <SidebarSection className="mt-auto">
          <SidebarItem href="#">
            <Cog6ToothIcon />
            <SidebarLabel>設定</SidebarLabel>
          </SidebarItem>
        </SidebarSection>
      </SidebarBody>
    </Sidebar>
  );

  return (
    <SidebarLayout navbar={nav} sidebar={sidebar}>
      <div className="flex h-[calc(100svh-theme(spacing.24))] lg:h-[calc(100svh-theme(spacing.24))] flex-col">
        <header className="flex items-center border-b border-zinc-950/5 pb-4 dark:border-white/5 shrink-0">
          <div>
            <h1 className="text-xl font-semibold leading-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <SparklesIcon className="h-5 w-5 text-orange-500" />
              Restaurant Search
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Gemini AI will find the perfect place for you.</p>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto py-6 pr-2">
          <div className="mx-auto max-w-3xl space-y-6">
            {messages.map((msg, index) => (
              <div key={index} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-5 py-3.5 shadow-sm ${
                  msg.role === 'user'
                    ? 'rounded-br-sm bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                    : 'rounded-bl-sm border border-zinc-950/5 bg-zinc-50 text-zinc-900 dark:border-white/5 dark:bg-zinc-800/50 dark:text-zinc-100'
                }`}>
                  <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{msg.content}</p>
                </div>
                {msg.role === 'assistant' && msg.usedTools && msg.usedTools.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5 px-1">
                    {msg.usedTools.map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                      >
                        {TOOL_LABELS[t] ?? t}
                      </span>
                    ))}
                  </div>
                )}
                {msg.role === 'assistant' && msg.places && msg.places.length > 0 && (
                  <div className="w-full max-w-[85%] sm:max-w-[75%]">
                    <RestaurantCards places={msg.places} />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm border border-zinc-950/5 bg-zinc-50 px-5 py-4 shadow-sm dark:border-white/5 dark:bg-zinc-800/50">
                  <div className="h-2 w-2 animate-[bounce_1.4s_infinite_ease-in-out_both] rounded-full bg-zinc-400 dark:bg-zinc-500" style={{ animationDelay: '-0.32s' }} />
                  <div className="h-2 w-2 animate-[bounce_1.4s_infinite_ease-in-out_both] rounded-full bg-zinc-400 dark:bg-zinc-500" style={{ animationDelay: '-0.16s' }} />
                  <div className="h-2 w-2 animate-[bounce_1.4s_infinite_ease-in-out_both] rounded-full bg-zinc-400 dark:bg-zinc-500" />
                </div>
              </div>
            )}

            {error && (
              <div className="my-4 flex justify-center">
                <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                  {error}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </main>

        <footer className="shrink-0 border-t border-zinc-950/5 pt-4 dark:border-white/5">
          <div className="mx-auto max-w-3xl">
            <form onSubmit={handleSubmit} className="flex items-end gap-3">
              <div className="flex-1">
                <Input
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="例: 渋谷で落ち着いた雰囲気のイタリアンを探して"
                  disabled={isLoading}
                  autoComplete="off"
                  className="py-2.5 text-[15px]"
                />
              </div>
              <Button
                type="submit"
                color="dark/zinc"
                disabled={!inputText.trim() || isLoading}
              >
                送信
              </Button>
            </form>
            <p className="mt-3 text-center text-[11px] text-zinc-500 dark:text-zinc-400">
              AIコンシェルジュは不正確な情報を提示することがあります。
            </p>
          </div>
        </footer>
      </div>
    </SidebarLayout>
  );
}
