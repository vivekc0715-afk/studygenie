import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Editor } from '@monaco-editor/react';
import {
  ArrowRight,
  Bot,
  Check,
  ChevronDown,
  ClipboardList,
  Clock3,
  Copy,
  Eraser,
  History,
  Info,
  Keyboard,
  MemoryStick,
  PanelRight,
  Play,
  RotateCcw,
  Sparkles,
  Terminal,
  TerminalSquare,
  TriangleAlert,
} from 'lucide-react';
import { codeService } from '../../services/code.service';
import { qk } from '../../lib/queryClient';
import { toastError } from '../../lib/notify';
import { useDocumentTitle } from '../../hooks/use-document-title';
import { PageHeader } from '../../components/common/page-header';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge, statusVariant } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { Skeleton, SkeletonRows } from '../../components/ui/skeleton';
import { Spinner } from '../../components/ui/spinner';
import { EmptyState, ErrorState, NotConfigured } from '../../components/ui/empty-state';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { cn, formatDateTime, humaniseKey, relativeTime } from '../../lib/utils';

const DRAFTS_KEY = 'bca-smartlearn:compiler:drafts';
const LANGUAGE_KEY = 'bca-smartlearn:compiler:language';

const EXTRA_STATUS_VARIANT = {
  compilation_error: 'peach',
  runtime_error: 'danger',
  time_limit_exceeded: 'butter',
  memory_limit_exceeded: 'butter',
  internal_error: 'danger',
};

/** Uses the shared status map, plus the terminal judge statuses it does not list. */
function statusBadgeVariant(status) {
  const base = statusVariant(status);
  return base && base !== 'neutral' ? base : EXTRA_STATUS_VARIANT[status] || 'neutral';
}

function readStored(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeStored(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — drafts simply will not persist */
  }
}

function timeText(seconds) {
  return Number(seconds) > 0 ? `${Number(seconds).toFixed(3)} s` : '—';
}

function memoryText(kb) {
  const value = Number(kb) || 0;
  if (!value) return '—';
  return value >= 1024 ? `${(value / 1024).toFixed(1)} MB` : `${Math.round(value)} KB`;
}

/** Shared segmented / tab control. */
function SegmentedControl({ options, value, onChange, className, ariaLabel }) {
  return (
    <div role="tablist" aria-label={ariaLabel} className={cn('flex items-center gap-1 rounded-xl border border-line bg-surface p-1', className)}>
      {options.map((option) => {
        const Icon = option.icon;
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors',
              active ? 'bg-brand-soft text-brand' : 'text-ink-muted hover:bg-canvas-deep hover:text-ink'
            )}
          >
            {Icon ? <Icon className="size-4" /> : null}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function ConsoleOutput({ result }) {
  const [copied, setCopied] = useState(false);

  const combined = useMemo(() => {
    if (!result) return '';
    return [
      result.stdout || '',
      result.stderr ? `--- stderr ---\n${result.stderr}` : '',
      result.compileOutput ? `--- compiler ---\n${result.compileOutput}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }, [result]);

  const copy = useCallback(async () => {
    if (!combined) return;
    try {
      await navigator.clipboard.writeText(combined);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  }, [combined]);

  if (!result) {
    return (
      <EmptyState
        compact
        preset="empty"
        icon={Terminal}
        title="No output yet"
        description="Run your program to see stdout, errors, execution time and memory here."
      />
    );
  }

  const hasBody = Boolean(combined.trim());

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={statusBadgeVariant(result.status)}>{humaniseKey(result.status || 'queued')}</Badge>
        <span className="inline-flex items-center gap-1 text-[12.5px] text-ink-muted">
          <Clock3 className="size-3.5" /> {timeText(result.timeSeconds)}
        </span>
        <span className="inline-flex items-center gap-1 text-[12.5px] text-ink-muted">
          <MemoryStick className="size-3.5" /> {memoryText(result.memoryKb)}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="iconSm"
          onClick={copy}
          disabled={!hasBody}
          className="ml-auto"
          aria-label="Copy output"
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        </Button>
      </div>

      <div className="max-h-[22rem] overflow-auto rounded-xl border border-ink/10 bg-[#211d18] p-3.5 font-mono text-[12.5px] leading-relaxed text-[#f4efe8]">
        {!hasBody ? (
          <p className="text-white/45">Program produced no output.</p>
        ) : (
          <>
            {result.stdout ? <pre className="whitespace-pre-wrap break-words">{result.stdout}</pre> : null}
            {result.stderr ? (
              <pre className="mt-3 whitespace-pre-wrap break-words text-[#f3b0a8]">{result.stderr}</pre>
            ) : null}
            {result.compileOutput ? (
              <pre className="mt-3 whitespace-pre-wrap break-words text-[#f2d59a]">{result.compileOutput}</pre>
            ) : null}
          </>
        )}
      </div>

      {result.message ? (
        <p className="rounded-lg bg-butter-soft px-3 py-2 text-[12.5px] text-butter-ink">{result.message}</p>
      ) : null}
    </div>
  );
}

function SubmissionDetailDialog({ submissionId, onOpenChange }) {
  const query = useQuery({
    queryKey: qk.submissions({ id: submissionId }),
    queryFn: () => codeService.submission(submissionId),
    enabled: Boolean(submissionId),
  });
  const detail = query.data;

  return (
    <Dialog open={Boolean(submissionId)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Submission details</DialogTitle>
          <DialogDescription>
            {detail ? `${humaniseKey(detail.language)} · ${formatDateTime(detail.createdAt)}` : 'Loading submission…'}
          </DialogDescription>
        </DialogHeader>

        {query.isLoading ? (
          <div className="space-y-2.5">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-40" />
          </div>
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={query.refetch} />
        ) : detail ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={statusBadgeVariant(detail.status)}>{humaniseKey(detail.status)}</Badge>
              <span className="inline-flex items-center gap-1 text-[12.5px] text-ink-muted">
                <Clock3 className="size-3.5" /> {timeText(detail.timeSeconds)}
              </span>
              <span className="inline-flex items-center gap-1 text-[12.5px] text-ink-muted">
                <MemoryStick className="size-3.5" /> {memoryText(detail.memoryKb)}
              </span>
              {detail.totalTests ? (
                <span className="text-[12.5px] text-ink-muted">
                  {detail.passedTests}/{detail.totalTests} tests passed
                </span>
              ) : null}
            </div>

            <div>
              <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-ink-faint">Source code</p>
              <div className="max-h-64 overflow-auto rounded-xl border border-ink/10 bg-[#211d18] p-3.5 font-mono text-[12.5px] leading-relaxed text-[#f4efe8]">
                <pre className="whitespace-pre-wrap break-words">{detail.sourceCode}</pre>
              </div>
            </div>

            <ConsoleOutput result={detail} />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function HistoryList({ onOpen, className }) {
  const query = useQuery({
    queryKey: qk.submissions({ page: 1, limit: 8 }),
    queryFn: () => codeService.submissions({ page: 1, limit: 8 }),
  });

  const items = query.data?.data || [];

  return (
    <Card className={className}>
      <CardHeader className="flex-row items-center justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <History className="size-4 text-ink-muted" /> Console history
          </CardTitle>
          <p className="mt-0.5 text-[12.5px] text-ink-muted">Your last executed and judged submissions.</p>
        </div>
        <Button variant="ghost" size="iconSm" onClick={() => query.refetch()} aria-label="Refresh history">
          <RotateCcw className="size-3.5" />
        </Button>
      </CardHeader>
      <CardContent>
        {query.isLoading ? (
          <SkeletonRows count={4} />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={query.refetch} />
        ) : items.length === 0 ? (
          <EmptyState
            compact
            preset="empty"
            title="No submissions yet"
            description="Every run and judged submission will appear here."
          />
        ) : (
          <ul className="divide-y divide-line">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onOpen(item.id)}
                  className="flex w-full items-center gap-3 rounded-lg px-1 py-2.5 text-left transition-colors hover:bg-canvas-deep"
                >
                  <Badge variant={statusBadgeVariant(item.status)} size="sm">
                    {humaniseKey(item.status)}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-ink">
                      {item.exercise?.title || `${humaniseKey(item.language)} · free run`}
                    </p>
                    <p className="text-[11.5px] text-ink-muted">
                      {relativeTime(item.createdAt)} · {timeText(item.timeSeconds)} · {memoryText(item.memoryKb)}
                    </p>
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-ink-faint" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default function Compiler() {
  useDocumentTitle('Online compiler');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const metaQuery = useQuery({ queryKey: qk.codeMeta, queryFn: () => codeService.meta() });
  const languagesQuery = useQuery({ queryKey: qk.codeLanguages, queryFn: () => codeService.languages() });

  const meta = metaQuery.data;
  const languages = meta?.languages || [];
  const configured = Boolean(meta?.codeExecutionConfigured);
  const resolved = languagesQuery.data?.resolved || null;

  const [language, setLanguage] = useState(() => {
    const stored = readStored(LANGUAGE_KEY, null);
    return typeof stored === 'string' ? stored : '';
  });
  const [drafts, setDrafts] = useState(() => {
    const stored = readStored(DRAFTS_KEY, {});
    return stored && typeof stored === 'object' ? stored : {};
  });
  const [stdin, setStdin] = useState('');
  const [runResult, setRunResult] = useState(null);
  const [leftTab, setLeftTab] = useState('editor');
  const [mobileView, setMobileView] = useState('editor');
  const [splitPct, setSplitPct] = useState(58);
  const [detailId, setDetailId] = useState(null);

  const splitRef = useRef(null);
  const draggingRef = useRef(false);

  /* Keep the selected language valid as the catalogue loads. */
  useEffect(() => {
    if (!languages.length) return;
    if (!languages.some((entry) => entry.key === language)) setLanguage(languages[0].key);
  }, [languages, language]);

  /* Persist the last language + per-language drafts. */
  useEffect(() => {
    if (language) writeStored(LANGUAGE_KEY, language);
  }, [language]);

  useEffect(() => {
    const timer = setTimeout(() => writeStored(DRAFTS_KEY, drafts), 500);
    return () => clearTimeout(timer);
  }, [drafts]);

  const activeLanguage = useMemo(
    () => languages.find((entry) => entry.key === language) || null,
    [languages, language]
  );

  const sourceCode = drafts[language] ?? activeLanguage?.starterCode ?? '';

  const languageAvailable = configured
    ? resolved
      ? Boolean(resolved[language])
      : true
    : false;

  const updateCode = useCallback(
    (value) => {
      if (!language) return;
      setDrafts((previous) => ({ ...previous, [language]: value ?? '' }));
    },
    [language]
  );

  const resetToStarter = useCallback(() => {
    if (!language) return;
    setDrafts((previous) => ({ ...previous, [language]: activeLanguage?.starterCode ?? '' }));
  }, [language, activeLanguage]);

  const runMutation = useMutation({
    mutationFn: () => codeService.run({ language, sourceCode, stdin }),
    onSuccess: (result) => {
      setRunResult(result);
      setMobileView('output');
      queryClient.invalidateQueries({ queryKey: ['code'] });
    },
    onError: (error) => toastError(error, 'Could not run your program.'),
  });

  const canRun = configured && Boolean(language) && Boolean(sourceCode.trim()) && !runMutation.isPending;

  const handleRun = useCallback(() => {
    if (!canRun) return;
    setRunResult(null);
    runMutation.mutate();
  }, [canRun, runMutation]);

  /* ------------------------------------------- resizable desktop divider */
  const onDividerPointerDown = useCallback((event) => {
    draggingRef.current = true;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }, []);

  const onDividerPointerMove = useCallback((event) => {
    if (!draggingRef.current || !splitRef.current) return;
    const rect = splitRef.current.getBoundingClientRect();
    const pct = ((event.clientX - rect.left) / rect.width) * 100;
    setSplitPct(Math.min(80, Math.max(30, pct)));
  }, []);

  const onDividerPointerUp = useCallback((event) => {
    draggingRef.current = false;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  }, []);

  /* AI assistant state */
  const [aiOpen, setAiOpen] = useState(false);
  const [aiAction, setAiAction] = useState('explain');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResult, setAiResult] = useState(null);

  const aiMutation = useMutation({
    mutationFn: ({ action, prompt }) =>
      codeService.aiAssist({ language, sourceCode, action, prompt }),
    onSuccess: (data) => setAiResult(data),
    onError: (e) => toastError(e, 'AI assistant error.'),
  });

  const AI_ACTIONS = [
    { value: 'explain', label: '🔍 Explain', desc: 'Explain what this code does' },
    { value: 'debug', label: '🐛 Debug & Fix', desc: 'Find and fix bugs' },
    { value: 'optimize', label: '⚡ Optimize', desc: 'Suggest performance improvements' },
    { value: 'generate', label: '✨ Generate', desc: 'Generate code from your prompt' },
  ];

  const editorOptions = useMemo(
    () => ({
      fontSize: 14,
      minimap: { enabled: false },
      automaticLayout: true,
      tabSize: 4,
      insertSpaces: true,
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
      padding: { top: 12, bottom: 12 },
      lineNumbersMinChars: 3,
      glyphMargin: false,
      folding: true,
      smoothScrolling: true,
    }),
    []
  );

  const mobileOptions = [
    { value: 'editor', label: 'Editor', icon: Keyboard },
    { value: 'input', label: 'Input', icon: ClipboardList },
    { value: 'output', label: 'Output', icon: Terminal },
  ];

  const desktopTabs = [
    { value: 'editor', label: 'Editor', icon: Keyboard },
    { value: 'input', label: 'Input (stdin)', icon: ClipboardList },
  ];

  return (
    <div className="space-y-4 pb-20 lg:pb-0">
      <PageHeader
        icon={TerminalSquare}
        eyebrow="Practice"
        title="Online compiler"
        description="Write, run and inspect code in C, Java or Python. Switch languages any time — your drafts are kept."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => navigate('/app/practice')}>
              <ClipboardList className="size-4" /> Practice exercises
            </Button>
          </>
        }
      />

      {metaQuery.isError ? (
        <ErrorState error={metaQuery.error} onRetry={metaQuery.refetch} />
      ) : metaQuery.isLoading ? (
        <Skeleton className="h-12" />
      ) : !configured ? (
        <div className="flex items-center gap-2 rounded-lg border border-butter bg-butter-soft px-4 py-2.5 text-[13px] text-butter-ink">
          <TriangleAlert className="size-4 shrink-0" />
          <span>Online execution is not configured ({meta?.hint || 'set JUDGE0_API_KEY'}). You can still write code and use the AI assistant.</span>
        </div>
      ) : null}

      {/* ------------------------------------------------ toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={language || undefined} onValueChange={setLanguage} disabled={!languages.length}>
          <SelectTrigger className="h-10 w-[10.5rem]" aria-label="Select language">
            <SelectValue placeholder="Language" />
          </SelectTrigger>
          <SelectContent>
            {languages.map((entry) => {
              const available = resolved ? Boolean(resolved[entry.key]) : configured;
              return (
                <SelectItem key={entry.key} value={entry.key} disabled={configured && !available}>
                  {entry.label}
                  {configured && !available ? ' · unavailable' : ''}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={resetToStarter} disabled={!language}>
          <Eraser className="size-4" /> Reset to starter
        </Button>

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setRunResult(null);
              setStdin('');
              setMobileView('editor');
            }}
          >
            Clear console
          </Button>
          <Button onClick={handleRun} disabled={!canRun} className="hidden lg:inline-flex">
            {runMutation.isPending ? <Spinner size={16} className="text-white" /> : <Play className="size-4" />}
            {runMutation.isPending ? 'Running…' : 'Run code'}
          </Button>
        </div>
      </div>

      {/* languages may be empty if not configured – that's fine, user can still write */ }

      {/* ------------------------------------------------ coding area */}
      <div>
        {/* mobile segmented control */}
        <SegmentedControl
          ariaLabel="Compiler panels"
          options={mobileOptions}
          value={mobileView}
          onChange={setMobileView}
          className="lg:hidden"
        />

        <div ref={splitRef} className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-stretch">
          {/* left column — editor + stdin */}
          <div
            style={{ '--split': `${splitPct}%` }}
            className={cn(
              'min-w-0',
              mobileView === 'output' ? 'hidden' : 'block',
              'lg:block lg:shrink-0 lg:basis-[var(--split)]'
            )}
          >
            <div className="mb-2 hidden lg:block">
              <SegmentedControl
                ariaLabel="Editor panels"
                options={desktopTabs}
                value={leftTab}
                onChange={setLeftTab}
              />
            </div>

            <div className={cn(leftTab === 'editor' ? 'lg:block' : 'lg:hidden', mobileView === 'editor' ? 'block' : 'hidden')}>
              <Card className="overflow-hidden p-0">
                <div className="h-[360px] lg:h-[560px]">
                  {activeLanguage ? (
                    <Editor
                      key={activeLanguage.key}
                      language={activeLanguage.monacoLanguage || activeLanguage.key}
                      value={sourceCode}
                      onChange={updateCode}
                      theme="light"
                      options={editorOptions}
                      loading={
                        <div className="flex h-full items-center justify-center gap-2 text-[13px] text-ink-muted">
                          <Spinner size={16} /> Loading editor…
                        </div>
                      }
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Spinner size={18} />
                    </div>
                  )}
                </div>
              </Card>
            </div>

            <div className={cn(leftTab === 'input' ? 'lg:block' : 'lg:hidden', mobileView === 'input' ? 'block' : 'hidden')}>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-[14px]">
                    <ClipboardList className="size-4 text-ink-muted" /> Program input (stdin)
                  </CardTitle>
                  <p className="text-[12.5px] text-ink-muted">
                    Optional. Provide the input your program reads from standard input.
                  </p>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={stdin}
                    onChange={(event) => setStdin(event.target.value)}
                    placeholder="e.g. 5&#10;3 1 4 1 5"
                    spellCheck={false}
                    className="min-h-[240px] font-mono text-[12.5px]"
                    aria-label="Program standard input"
                  />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* desktop divider */}
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize editor and output panels"
            tabIndex={0}
            onPointerDown={onDividerPointerDown}
            onPointerMove={onDividerPointerMove}
            onPointerUp={onDividerPointerUp}
            onPointerCancel={onDividerPointerUp}
            className="hidden w-2 cursor-col-resize items-center justify-center rounded-full bg-transparent lg:flex"
          >
            <span className="h-10 w-1 rounded-full bg-line-strong" />
          </div>

          {/* right column — output console */}
          <div className={cn('min-w-0 flex-1', mobileView === 'output' ? 'block' : 'hidden', 'lg:block')}>
            <Card className="lg:h-[calc(560px+3.25rem)]">
              <CardHeader className="flex-row items-center justify-between gap-3 pb-2">
                <CardTitle className="flex items-center gap-2 text-[14px]">
                  <PanelRight className="size-4 text-ink-muted" /> Output
                </CardTitle>
                {runMutation.isPending ? (
                  <span className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-muted">
                    <Spinner size={14} /> Running…
                  </span>
                ) : null}
              </CardHeader>
              <CardContent>
                {runMutation.isError && !runMutation.error?.notConfigured ? (
                  <div className="mb-3 flex items-start gap-2 rounded-lg bg-danger-soft px-3 py-2 text-[12.5px] text-danger">
                    <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                    <span>{runMutation.error?.message || 'Execution failed.'}</span>
                  </div>
                ) : null}
                <ConsoleOutput result={runResult} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------ AI Assistant */}
      <Card className="border-brand/30 bg-gradient-to-br from-brand-soft/40 to-lavender-soft/40">
        <button
          type="button"
          className="flex w-full items-center gap-3 px-5 py-4 text-left"
          onClick={() => setAiOpen((o) => !o)}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand text-white">
            <Bot className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-ink">AI Code Assistant</p>
            <p className="text-[12px] text-ink-muted">Explain, debug, optimize or generate code with AI</p>
          </div>
          <ChevronDown className={cn('size-5 text-ink-muted transition-transform', aiOpen && 'rotate-180')} />
        </button>

        {aiOpen && (
          <CardContent className="border-t border-line pt-4">
            <div className="space-y-4">
              {/* action selector */}
              <div className="flex flex-wrap gap-2">
                {AI_ACTIONS.map((a) => (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() => setAiAction(a.value)}
                    className={cn(
                      'rounded-lg border px-3 py-1.5 text-[12.5px] font-medium transition-colors',
                      aiAction === a.value
                        ? 'border-brand bg-brand text-white'
                        : 'border-line text-ink-muted hover:border-brand/40 hover:text-ink'
                    )}
                  >
                    {a.label}
                  </button>
                ))}
              </div>

              {aiAction === 'generate' && (
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-ink-muted">Describe what you want to generate</label>
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    rows={3}
                    placeholder="e.g. Write a function that reverses a linked list in C"
                    className="w-full resize-none rounded-lg border border-line bg-surface px-3 py-2 text-[13px] text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none"
                  />
                </div>
              )}

              <Button
                onClick={() => {
                  setAiResult(null);
                  aiMutation.mutate({ action: aiAction, prompt: aiPrompt });
                }}
                disabled={aiMutation.isPending || !sourceCode.trim()}
              >
                {aiMutation.isPending ? (
                  <><Spinner size={15} className="text-white" /> Processing…</>
                ) : (
                  <><Sparkles className="size-4" /> {AI_ACTIONS.find((a) => a.value === aiAction)?.label || 'Run'}</>
                )}
              </Button>

              {aiResult && (
                <div className="rounded-xl border border-line bg-canvas-deep p-4">
                  <p className="mb-2 text-[11.5px] font-semibold uppercase tracking-wider text-ink-faint">AI Response</p>
                  <div className="max-h-[30rem] overflow-auto">
                    {(aiResult.explanation || aiResult.result) && (
                      <pre className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-ink">{aiResult.explanation || aiResult.result}</pre>
                    )}
                    {aiResult.fixedCode && (
                      <div className="mt-4">
                        <p className="mb-1 text-[12px] font-semibold text-ink-muted">Fixed / Generated Code</p>
                        <div className="overflow-auto rounded-lg bg-[#1e1e1e] p-3 text-[12.5px]">
                          <pre className="whitespace-pre-wrap break-words font-mono text-[#d4d4d4]">{aiResult.fixedCode}</pre>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2"
                          onClick={() => updateCode(aiResult.fixedCode)}
                        >
                          ↑ Apply to editor
                        </Button>
                      </div>
                    )}
                    {aiResult.suggestions && Array.isArray(aiResult.suggestions) && (
                      <div className="mt-3">
                        <p className="mb-1 text-[12px] font-semibold text-ink-muted">Suggestions</p>
                        <ul className="list-disc pl-5 space-y-1">
                          {aiResult.suggestions.map((s, i) => (
                            <li key={i} className="text-[13px] text-ink">{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* ------------------------------------------------ judged note + history */}
      <div className="grid gap-4 2xl:grid-cols-2">
        <Card className="border-lavender bg-lavender-soft">
          <CardContent className="flex flex-wrap items-start gap-3 p-5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand">
              <Info className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-ink">Scoring happens on practice exercises</p>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-soft">
                Judge0 runs here are exploratory. To be graded against sample and hidden test cases, open an exercise —
                the Submit action lives there.
              </p>
            </div>
            <Button size="sm" variant="subtle" onClick={() => navigate('/app/practice')}>
              Go to practice <ArrowRight className="size-4" />
            </Button>
          </CardContent>
        </Card>

        <HistoryList onOpen={setDetailId} />
      </div>

      {/* ------------------------------------------------ mobile sticky run bar */}
      <div className="sticky bottom-0 z-20 -mb-20 mt-1 border-t border-line bg-surface/95 px-1 py-2.5 backdrop-blur lg:hidden">
        <Button block size="lg" onClick={handleRun} disabled={!canRun}>
          {runMutation.isPending ? <Spinner size={18} className="text-white" /> : <Play className="size-4" />}
          {runMutation.isPending ? 'Running…' : 'Run code'}
        </Button>
      </div>

      <SubmissionDetailDialog submissionId={detailId} onOpenChange={(open) => !open && setDetailId(null)} />
    </div>
  );
}
