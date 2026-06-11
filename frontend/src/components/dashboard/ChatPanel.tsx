import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Loader2, BookOpen, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { chatApi } from '../../lib/api';
import { useAppStore } from '../../store';
import type { Message, Citation } from '../../types';

export default function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [expandedCitation, setExpandedCitation] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const currentChatId = useAppStore((s) => s.currentChatId);
  const setCurrentChatId = useAppStore((s) => s.setCurrentChatId);
  const selectedDocuments = useAppStore((s) => s.selectedDocuments);
  const setLatestCitations = useAppStore((s) => s.setLatestCitations);
  const setSidebarData = useAppStore((s) => s.setSidebarData);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || streaming) return;
    const userMessage = input.trim();
    setInput('');
    setStreaming(true);

    const tempUserMsg: Message = {
      id: Date.now(),
      chat_id: currentChatId || 0,
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    const tempAssistant: Message = {
      id: Date.now() + 1,
      chat_id: currentChatId || 0,
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempAssistant]);

    try {
      let fullContent = '';
      let citations: Citation[] = [];
      let confidence = 0;

      for await (const event of chatApi.sendStream({
        message: userMessage,
        chat_id: currentChatId || undefined,
        document_ids: selectedDocuments.length ? selectedDocuments : undefined,
      })) {
        if (event.type === 'token') {
          fullContent += event.content;
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = { ...updated[updated.length - 1], content: fullContent };
            return updated;
          });
        } else if (event.type === 'complete') {
          citations = event.citations || [];
          confidence = event.confidence || 0;
          if (event.chat_id) setCurrentChatId(event.chat_id);
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              content: fullContent,
              citations,
              confidence,
            };
            return updated;
          });
        }
      }

      setLatestCitations(citations);
      setSidebarData({ confidence });
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: 'Sorry, an error occurred while processing your request.',
        };
        return updated;
      });
    } finally {
      setStreaming(false);
    }
  };

  const handleExportChat = () => {
    if (messages.length === 0) return;
    const content = messages.map(m => `[${m.role.toUpperCase()}] (${new Date(m.created_at).toLocaleString()})\n${m.content}\n\n`).join('');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexus-chat-${new Date().toISOString().slice(0,10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-nexus-accent/10 flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-nexus-accent-light" />
            </div>
            <h2 className="font-display text-xl font-semibold mb-2">NexusRAG Assistant</h2>
            <p className="text-nexus-muted text-sm max-w-md">
              Ask questions about your uploaded documents. Every answer includes citations with confidence scores.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-8 max-w-lg">
              {[
                'What are the key findings across all documents?',
                'Summarize the main topics covered',
                'Compare insights between documents',
                'What entities are mentioned most frequently?',
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="text-left text-xs p-3 rounded-lg border border-nexus-border hover:border-nexus-accent/40 text-nexus-muted hover:text-nexus-text transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-lg bg-nexus-accent/15 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-nexus-accent-light" />
                </div>
              )}
              <div className={`max-w-[75%] ${msg.role === 'user' ? 'order-first' : ''}`}>
                <div
                  className={`p-4 rounded-xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-nexus-accent/15 border border-nexus-accent/20'
                      : 'nexus-panel'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                  {msg.role === 'assistant' && !msg.content && streaming && (
                    <Loader2 className="w-4 h-4 animate-spin text-nexus-muted" />
                  )}
                </div>

                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-2">
                    <button
                      onClick={() => setExpandedCitation(expandedCitation === msg.id ? null : msg.id)}
                      className="flex items-center gap-1 text-xs text-nexus-accent-light hover:underline"
                    >
                      <BookOpen className="w-3 h-3" />
                      {msg.citations.length} source{msg.citations.length > 1 ? 's' : ''}
                      {expandedCitation === msg.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                    {expandedCitation === msg.id && (
                      <div className="mt-2 space-y-2">
                        {msg.citations.map((c, i) => (
                          <div key={i} className="text-xs p-2 rounded-lg bg-nexus-bg border border-nexus-border">
                            <p className="font-medium">{c.document_name}</p>
                            <p className="text-nexus-muted">Page {c.page_number} · Confidence {c.confidence}%</p>
                            {c.excerpt && <p className="mt-1 text-nexus-muted italic">"{c.excerpt}..."</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {msg.confidence != null && msg.confidence > 0 && (
                  <p className="text-[10px] text-nexus-muted mt-1">
                    Confidence: {msg.confidence}%
                  </p>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-nexus-panel flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-nexus-muted" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      <div className="p-4 border-t border-nexus-border flex flex-col gap-2">
        <div className="flex justify-between items-center px-1">
          <span className="text-xs text-nexus-muted">
            {messages.length > 0 ? `${messages.length} messages` : 'Start a new conversation'}
          </span>
          {messages.length > 0 && (
            <button 
              onClick={handleExportChat}
              className="flex items-center gap-1 text-xs text-nexus-muted hover:text-white transition-colors"
            >
              <Download className="w-3 h-3" />
              Export Chat (TXT)
            </button>
          )}
        </div>
        <div className="flex gap-3 max-w-4xl mx-auto w-full">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Ask about your documents..."
            className="nexus-input flex-1"
            disabled={streaming}
          />
          <button
            onClick={handleSend}
            disabled={streaming || !input.trim()}
            className="nexus-btn-primary px-4 disabled:opacity-50"
          >
            {streaming ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
