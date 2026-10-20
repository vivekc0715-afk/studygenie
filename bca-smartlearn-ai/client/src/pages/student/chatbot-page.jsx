import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bot,
  Sparkles,
  Send,
  Search,
  BookOpen,
  Code2,
  Copy,
  Check,
  ExternalLink,
  HelpCircle,
  Layers,
  GraduationCap,
} from 'lucide-react';
import { api } from '../../lib/api';
import { PageHeader } from '../../components/common/page-header';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { notifySuccess } from '../../lib/notify';
import { useDocumentTitle } from '../../hooks/use-document-title';
import { cn } from '../../lib/utils';

export default function ChatbotPage() {
  useDocumentTitle('AI Study Assistant & Prebuilt Answers');

  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [customInput, setCustomInput] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch prebuilt answers
  const { data: prebuiltList = [] } = useQuery({
    queryKey: ['chat', 'prebuilt'],
    queryFn: async () => {
      const res = await api.get('/chat/prebuilt');
      return res.data || [];
    },
  });

  // Default select first topic when loaded
  useEffect(() => {
    if (prebuiltList.length > 0 && !selectedTopic) {
      setSelectedTopic(prebuiltList[0]);
    }
  }, [prebuiltList, selectedTopic]);

  const categories = ['All', ...new Set(prebuiltList.map((p) => p.category))];

  const filteredTopics = prebuiltList.filter((item) => {
    const matchesCat = activeCategory === 'All' || item.category === activeCategory;
    const query = search.toLowerCase().trim();
    const matchesSearch =
      !query ||
      item.question.toLowerCase().includes(query) ||
      item.summary.toLowerCase().includes(query) ||
      (item.keywords || []).some((k) => k.toLowerCase().includes(query));
    return matchesCat && matchesSearch;
  });

  const handleAskCustom = async (queryText) => {
    const q = (queryText || customInput).trim();
    if (!q || loading) return;

    setLoading(true);
    const userMsg = { sender: 'user', text: q };
    setChatHistory((prev) => [...prev, userMsg]);
    setCustomInput('');

    try {
      const res = await api.post('/chat/message', { message: q });
      const botMsg = {
        sender: 'bot',
        text: res.data?.answer || 'Response generated.',
        category: res.data?.category,
        suggestions: res.data?.suggestions || [],
      };
      setChatHistory((prev) => [...prev, botMsg]);
    } catch {
      setChatHistory((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: `Here is a summary on **${q}**:\n\nThis is a fundamental BCA topic covered in your university syllabus. Check GeeksforGeeks for detailed code examples!`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const copyAnswer = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    notifySuccess('Copied to clipboard', 'Prebuilt answer copied for your notes.');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Bot}
        title="AI Study Assistant & Prebuilt Answers"
        description="Instant answers, syllabus concepts, and GeeksforGeeks notes curated for BCA university exams."
        actions={
          <Badge variant="brand" size="md">
            <Sparkles className="size-3.5" /> 30+ Prebuilt Answers
          </Badge>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
        {/* Left Column: Categories and Question List */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-[14px]">Search Question Bank</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search Stack, Normalization, OSI..."
                  className="w-full rounded-xl border border-line bg-canvas pl-9 pr-3 py-2 text-[13px] text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>

              {/* Category Pills */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={cn(
                      'rounded-lg px-2.5 py-1 text-[11.5px] font-medium transition',
                      activeCategory === cat
                        ? 'bg-brand text-white shadow-sm'
                        : 'border border-line bg-surface text-ink-soft hover:bg-canvas-deep hover:text-ink'
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Question List */}
          <div className="space-y-2">
            <h4 className="text-[12px] font-semibold uppercase tracking-wider text-ink-faint px-1">
              Questions ({filteredTopics.length})
            </h4>
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {filteredTopics.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setSelectedTopic(item);
                    setChatHistory([]);
                  }}
                  className={cn(
                    'w-full text-left rounded-xl border p-3 transition-all',
                    selectedTopic?.id === item.id
                      ? 'border-brand bg-brand/5 shadow-sm'
                      : 'border-line bg-surface hover:border-brand/40 hover:bg-canvas-deep/50'
                  )}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <Badge variant="neutral" size="xs">
                      {item.category}
                    </Badge>
                  </div>
                  <p className="text-[13px] font-medium text-ink line-clamp-2">{item.question}</p>
                  <p className="text-[11.5px] text-ink-muted line-clamp-1 mt-1">{item.summary}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Display Selected Answer or Chat Session */}
        <div className="space-y-4">
          {selectedTopic && (
            <Card>
              <CardHeader className="flex-row items-start justify-between gap-4 border-b border-line pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Badge variant="brand" size="sm">
                      {selectedTopic.category}
                    </Badge>
                    <span className="text-[12px] text-ink-muted">Prebuilt Verified Answer</span>
                  </div>
                  <CardTitle className="text-[18px] text-ink font-semibold">{selectedTopic.question}</CardTitle>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyAnswer(selectedTopic.response)}
                  className="shrink-0"
                >
                  {copied ? <Check className="size-3.5 text-mint-ink" /> : <Copy className="size-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy answer'}</span>
                </Button>
              </CardHeader>

              <CardContent className="pt-5 space-y-6">
                {/* Formatted Markdown Body */}
                <div className="prose prose-sm max-w-none text-ink text-[14px] leading-relaxed whitespace-pre-line">
                  {selectedTopic.response}
                </div>

                {/* Suggestions / Related questions */}
                {selectedTopic.suggestions && (
                  <div className="rounded-xl border border-line bg-canvas p-4 space-y-2.5">
                    <div className="flex items-center gap-2 text-[12.5px] font-medium text-ink">
                      <HelpCircle className="size-4 text-brand" />
                      <span>Related Questions & Follow-ups:</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedTopic.suggestions.map((sug, i) => (
                        <button
                          key={i}
                          onClick={() => handleAskCustom(sug)}
                          className="rounded-lg border border-line bg-surface px-3 py-1.5 text-[12px] font-medium text-ink-soft hover:border-brand hover:text-brand transition"
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Interactive Chat Responses */}
          {chatHistory.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-[13px] font-semibold text-ink px-1">Your Follow-up Conversation</h4>
              {chatHistory.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    'rounded-2xl p-4 shadow-sm border',
                    msg.sender === 'user'
                      ? 'border-brand/40 bg-brand/5 ml-12 text-ink'
                      : 'border-line bg-surface mr-12 text-ink space-y-2'
                  )}
                >
                  <div className="flex items-center justify-between text-[11.5px] font-medium text-ink-muted mb-1">
                    <span>{msg.sender === 'user' ? 'You' : 'BCA Assistant'}</span>
                  </div>
                  <div className="text-[13.5px] leading-relaxed whitespace-pre-line">{msg.text}</div>
                </div>
              ))}
            </div>
          )}

          {/* Input Box for custom question */}
          <Card padding="sm">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAskCustom();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="Ask any question about BCA syllabus, C code, SQL, or exams..."
                className="flex-1 rounded-xl border border-line bg-canvas px-4 py-2.5 text-[13.5px] text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
              <Button type="submit" disabled={!customInput.trim() || loading}>
                <Send className="size-4" />
                <span>{loading ? 'Thinking…' : 'Ask'}</span>
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
