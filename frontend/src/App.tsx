// @ts-nocheck
import { useState, useRef, useEffect } from 'react';
import { useChat } from './hooks/useChat';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';

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

  return (
    <div className="flex h-[100dvh] flex-col bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-sans">
      <header className="flex items-center px-6 py-4 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-white/10 shadow-sm shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-lg shadow-sm">
            R
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight">Restaurant Concierge</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Powered by Gemini & Maps</p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-4">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-5 py-3.5 shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-br-sm' 
                  : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 rounded-bl-sm'
              }`}>
                <p className="whitespace-pre-wrap leading-relaxed text-[15px]">{msg.content}</p>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 rounded-2xl rounded-bl-sm px-5 py-4 shadow-sm flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-zinc-400 dark:bg-zinc-500 animate-[bounce_1.4s_infinite_ease-in-out_both]" style={{ animationDelay: '-0.32s' }} />
                <div className="w-2 h-2 rounded-full bg-zinc-400 dark:bg-zinc-500 animate-[bounce_1.4s_infinite_ease-in-out_both]" style={{ animationDelay: '-0.16s' }} />
                <div className="w-2 h-2 rounded-full bg-zinc-400 dark:bg-zinc-500 animate-[bounce_1.4s_infinite_ease-in-out_both]" />
              </div>
            </div>
          )}
          
          {error && (
            <div className="flex justify-center my-4">
              <div className="bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 text-sm px-4 py-2 rounded-lg">
                {error}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      <footer className="bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-white/10 p-4 sm:p-6 shrink-0">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit} className="flex gap-3 items-end">
            <div className="flex-1">
              <Input
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="渋谷で落ち着いた雰囲気のイタリアンを探して"
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
          <p className="text-center text-[11px] text-zinc-500 dark:text-zinc-400 mt-3">
            AIコンシェルジュは不正確な情報を提示することがあります。
          </p>
        </div>
      </footer>
    </div>
  );
}
