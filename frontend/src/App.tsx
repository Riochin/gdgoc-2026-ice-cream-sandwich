import { useState, useRef, useEffect } from 'react';
import { useChat } from './hooks/useChat';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { SidebarLayout } from './components/ui/sidebar-layout';
import { Sidebar, SidebarHeader, SidebarBody, SidebarItem, SidebarLabel } from './components/ui/sidebar';
import { Navbar, NavbarItem, NavbarSection, NavbarSpacer } from './components/ui/navbar';
import { ChatBubbleLeftIcon, Cog6ToothIcon, SparklesIcon } from '@heroicons/react/20/solid';

export default function App() {
  const { messages, isLoading, error, sendMessage } = useChat();
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
        <SidebarItem current href="/">
          <ChatBubbleLeftIcon />
          <SidebarLabel>Chat</SidebarLabel>
        </SidebarItem>
        <SidebarItem href="#">
          <Cog6ToothIcon />
          <SidebarLabel>Settings</SidebarLabel>
        </SidebarItem>
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
              <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-5 py-3.5 shadow-sm ${
                  msg.role === 'user' 
                    ? 'rounded-br-sm bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' 
                    : 'rounded-bl-sm border border-zinc-950/5 bg-zinc-50 text-zinc-900 dark:border-white/5 dark:bg-zinc-800/50 dark:text-zinc-100'
                }`}>
                  <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{msg.content}</p>
                </div>
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
