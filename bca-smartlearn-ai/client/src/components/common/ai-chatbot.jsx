import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bot,
  Send,
  X,
  Sparkles,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  BookOpen,
  ArrowRight,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';
import { api } from '../../lib/api';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { notifySuccess } from '../../lib/notify';
import { cn } from '../../lib/utils';

const SUGGESTED_QUESTIONS = [
  'What is the difference between Stack and Queue?',
  'What are the 4 fundamental pillars of OOP?',
  'Explain Database Normalization (1NF to BCNF)',
  'Explain the 7 Layers of the OSI Model',
  'What is the difference between TCP and UDP?',
  'What are the 4 Coffman conditions for Deadlock?',
  'How to score 85%+ in BCA University Exams?',
];

function RenderMessageContent({ text }) {
  if (!text) return null;

  // Simple clean markdown parser for headings, code blocks, lists, and links
  const lines = text.split('\n');
  return (
    <div className="space-y-2 text-[13.5px] leading-relaxed text-ink">
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        if (trimmed.startsWith('### ')) {
          return (
            <h4 key={idx} className="font-semibold text-ink text-[14.5px] mt-2 mb-1">
              {trimmed.slice(4)}
            </h4>
          );
        }
        if (trimmed.startsWith('#### ')) {
          return (
            <h5 key={idx} className="font-medium text-brand text-[13.5px] mt-2 mb-0.5">
              {trimmed.slice(5)}
            </h5>
          );
        }
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <li key={idx} className="ml-4 list-disc text-ink-soft">
              {formatInline(trimmed.slice(2))}
            </li>
          );
        }
        if (trimmed.startsWith('1. ') || trimmed.startsWith('2. ') || trimmed.startsWith('3. ') || trimmed.startsWith('4. ') || trimmed.startsWith('5. ') || trimmed.startsWith('6. ')) {
          return (
            <div key={idx} className="ml-2 font-medium text-ink">
              {formatInline(trimmed)}
            </div>
          );
        }
        if (trimmed.startsWith('> 📚')) {
          return (
            <div key={idx} className="my-2 rounded-lg border border-brand/20 bg-brand/5 p-2.5 text-[12.5px] text-brand">
              {formatInline(trimmed)}
            </div>
          );
        }
        if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
          return (
            <div key={idx} className="overflow-x-auto text-[12px] font-mono text-ink-muted">
              {trimmed}
            </div>
          );
        }
        if (trimmed.startsWith('```')) {
          return null; // Handled if in code block or skip markers
        }
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }
        return (
          <p key={idx} className="text-ink-soft">
            {formatInline(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

function formatInline(str) {
  // Simple regex for bold **text**, links [text](url) and code `code`
  const parts = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(str)) !== null) {
    if (match.index > lastIndex) {
      parts.push(str.substring(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={match.index} className="font-semibold text-ink">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code key={match.index} className="rounded bg-canvas-deep px-1.5 py-0.5 text-[12px] font-mono text-brand">
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('[') && token.includes('](')) {
      const label = token.substring(1, token.indexOf(']('));
      const url = token.substring(token.indexOf('](') + 2, token.length - 1);
      parts.push(
        <a
          key={match.index}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-medium text-brand hover:underline"
        >
          {label} <ExternalLink className="size-3" />
        </a>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < str.length) {
    parts.push(str.substring(lastIndex));
  }

  return parts.length ? parts : str;
}

export function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const navigate = useNavigate();

  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'bot',
      text: `👋 **Hi! I'm your BCA SmartLearn AI Assistant.**\n\nI have instant **prebuilt exam answers** and **GeeksforGeeks revision notes** for all your semester subjects (Data Structures, DBMS, Java, OS, Networks, C, Python, and exam prep tips).\n\nAsk me anything, or tap a question below!`,
      suggestions: [
        'Stack vs Queue difference',
        '4 Pillars of OOP',
        'DBMS Normalization guide',
        '7 Layers of OSI model',
      ],
    },
  ]);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async (messageText) => {
    const textToSend = (messageText || input).trim();
    if (!textToSend || loading) return;

    const userMsg = {
      id: String(Date.now()),
      sender: 'user',
      text: textToSend,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post('/chat/message', {
        message: textToSend,
        conversationHistory: messages.slice(-4),
      });

      const botReply = {
        id: String(Date.now() + 1),
        sender: 'bot',
        text: res.data?.answer || 'I am ready to help you with BCA topics. Please try asking about Stack, DBMS, or OOP!',
        suggestions: res.data?.suggestions || [],
        source: res.data?.source || 'prebuilt',
        category: res.data?.category,
      };

      setMessages((prev) => [...prev, botReply]);
    } catch {
      // Fallback
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: 'bot',
          text: `Here is a quick overview for **${textToSend}**:\n\nIn BCA computer science, key topics like this are evaluated on definition, time complexity, and code implementation.\n\n> 📚 Check out [GeeksforGeeks](https://www.geeksforgeeks.org) for full tutorials!`,
          suggestions: SUGGESTED_QUESTIONS.slice(0, 3),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    notifySuccess('Copied to clipboard', 'You can paste this answer into your study notes.');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <>
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-full bg-brand px-4 py-3 text-white shadow-xl shadow-brand/25 transition-all hover:scale-105 hover:bg-brand-deep focus:outline-none focus:ring-4 focus:ring-brand/30"
          aria-label="Open AI Study Assistant"
        >
          <span className="relative flex size-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
            <span className="relative inline-flex size-3 rounded-full bg-white" />
          </span>
          <Bot className="size-5" />
          <span className="text-[13.5px] font-semibold tracking-wide">AI Study Assistant</span>
          <Badge variant="mint" size="xs" className="border-none bg-white/20 text-white">
            Prebuilt Answers
          </Badge>
        </button>
      )}

      {/* Chat Window Panel */}
      {isOpen && (
        <div
          className={cn(
            'fixed z-50 flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl transition-all duration-300',
            isExpanded
              ? 'bottom-4 right-4 h-[88vh] w-[92vw] max-w-4xl'
              : 'bottom-6 right-6 h-[560px] w-[390px] max-w-[calc(100vw-2rem)]'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-line bg-canvas/80 px-4 py-3 backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-xl bg-brand text-white shadow-sm">
                <Bot className="size-5" />
              </span>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-[14px] font-semibold text-ink">BCA Study Assistant</h3>
                  <Badge variant="brand" size="xs">
                    Smart Tutor
                  </Badge>
                </div>
                <p className="text-[11px] text-ink-muted">Prebuilt Answers & GeeksforGeeks Notes</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsExpanded((e) => !e)}
                className="rounded-lg p-1.5 text-ink-muted hover:bg-canvas-deep hover:text-ink"
                title={isExpanded ? 'Minimize' : 'Expand'}
              >
                {isExpanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
              </button>
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/app/chat');
                }}
                className="rounded-lg p-1.5 text-ink-muted hover:bg-canvas-deep hover:text-ink"
                title="Open Fullscreen Page"
              >
                <ExternalLink className="size-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-ink-muted hover:bg-canvas-deep hover:text-ink"
                title="Close"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn('flex flex-col', msg.sender === 'user' ? 'items-end' : 'items-start')}
              >
                <div
                  className={cn(
                    'max-w-[88%] rounded-2xl p-3.5 shadow-sm',
                    msg.sender === 'user'
                      ? 'bg-brand text-white'
                      : 'border border-line bg-canvas text-ink'
                  )}
                >
                  {msg.sender === 'bot' && (
                    <div className="mb-2 flex items-center justify-between gap-2 border-b border-line/60 pb-1.5">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="size-3.5 text-brand" />
                        <span className="text-[11px] font-medium uppercase tracking-wider text-brand">
                          {msg.category || 'AI Tutor'}
                        </span>
                      </div>
                      <button
                        onClick={() => copyToClipboard(msg.text, msg.id)}
                        className="flex items-center gap-1 text-[11px] text-ink-muted hover:text-brand"
                        title="Copy answer"
                      >
                        {copiedId === msg.id ? (
                          <Check className="size-3 text-mint-ink" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                        <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  )}

                  {msg.sender === 'user' ? (
                    <p className="text-[13.5px] leading-relaxed">{msg.text}</p>
                  ) : (
                    <RenderMessageContent text={msg.text} />
                  )}
                </div>

                {/* Follow-up suggestion chips */}
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5 pl-1">
                    {msg.suggestions.map((sug, i) => (
                      <button
                        key={i}
                        onClick={() => handleSend(sug)}
                        className="rounded-full border border-line bg-surface px-2.5 py-1 text-[11.5px] font-medium text-ink-soft transition-colors hover:border-brand hover:bg-brand/5 hover:text-brand"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 rounded-xl border border-line bg-canvas p-3 text-ink-muted">
                <span className="flex size-2 animate-ping rounded-full bg-brand" />
                <span className="text-[12.5px]">Fetching prebuilt answer & GeeksforGeeks notes…</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Bar */}
          <div className="border-t border-line bg-canvas/40 px-3 py-2 overflow-x-auto whitespace-nowrap flex gap-1.5 no-scrollbar">
            {SUGGESTED_QUESTIONS.map((q, i) => (
              <button
                key={i}
                onClick={() => handleSend(q)}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-line bg-surface px-2.5 py-1 text-[11.5px] font-medium text-ink-soft hover:border-brand hover:text-brand transition"
              >
                <span>💡 {q}</span>
              </button>
            ))}
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2 border-t border-line bg-surface p-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about Stack, DBMS Normalization, OSI, OOP..."
              className="flex-1 rounded-xl border border-line bg-canvas px-3.5 py-2 text-[13px] text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
            <Button type="submit" size="sm" disabled={!input.trim() || loading}>
              <Send className="size-4" />
            </Button>
          </form>
        </div>
      )}
    </>
  );
}

export default AIChatbot;
