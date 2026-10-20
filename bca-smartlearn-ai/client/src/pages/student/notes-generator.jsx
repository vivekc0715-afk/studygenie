import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, BookOpen, ListTree, Sparkles, Wand2 } from 'lucide-react';
import { notesService } from '../../services/notes.service';
import { qk } from '../../lib/queryClient';
import { notifySuccess, toastError } from '../../lib/notify';
import { useDocumentTitle } from '../../hooks/use-document-title';
import { PageHeader } from '../../components/common/page-header';
import { Field, FormGrid } from '../../components/common/form';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { Spinner } from '../../components/ui/spinner';
import { NotConfigured } from '../../components/ui/empty-state';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { humaniseKey } from '../../lib/utils';

const FORMAT_OPTIONS = [
  { value: 'quick_revision', label: 'Quick revision notes' },
  { value: 'detailed_conceptual', label: 'Detailed conceptual notes' },
  { value: 'short_answer', label: 'Short-answer exam prep' },
  { value: 'long_answer', label: 'Long-answer exam prep' },
  { value: 'definitions', label: 'Definitions & terminology' },
  { value: 'important_questions', label: 'Important questions' },
  { value: 'programming_examples', label: 'Worked programming examples' },
  { value: 'comparison_tables', label: 'Comparison tables' },
  { value: 'flashcards', label: 'Flashcards' },
  { value: 'practice_questions', label: 'Practice questions' },
  { value: 'last_minute', label: 'Last-minute revision sheet' },
  { value: 'viva_questions', label: 'Viva questions & answers' },
];

function unitFromTopic(topic) {
  if (!topic) return null;
  const unitObj = topic.unit;
  if (unitObj && typeof unitObj === 'object') {
    return { id: String(unitObj.id || unitObj._id || ''), title: unitObj.title || unitObj.name || 'Unit' };
  }
  const unitId = topic.unitId || topic.unit;
  if (!unitId) return null;
  return { id: String(unitId), title: topic.unitTitle || topic.unitName || 'Unit' };
}

function subjectName(subject) {
  return subject?.name || subject?.title || 'Subject';
}

export default function NotesGeneratorPage() {
  useDocumentTitle('Generate AI Notes');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const [subject, setSubject] = useState('');
  const [unit, setUnit] = useState('');
  const [topic, setTopic] = useState('');
  const [format, setFormat] = useState('quick_revision');
  const [prompt, setPrompt] = useState('');
  const [prefilled, setPrefilled] = useState(false);

  const metaQuery = useQuery({ queryKey: qk.noteMeta, queryFn: () => notesService.meta() });
  const subjectsQuery = useQuery({ queryKey: qk.noteSubjects, queryFn: () => notesService.subjects() });
  const topicsQuery = useQuery({
    queryKey: qk.noteTopics({ subjectId: subject }),
    queryFn: () => notesService.topics({ subjectId: subject }),
    enabled: Boolean(subject),
  });

  const subjects = subjectsQuery.data || [];
  const topics = topicsQuery.data || [];
  const aiConfigured = Boolean(metaQuery.data?.aiConfigured);

  // Derive units from the returned topics (notes scope has no dedicated units endpoint).
  const units = useMemo(() => {
    const seen = new Map();
    for (const t of topics) {
      const u = unitFromTopic(t);
      if (u?.id && !seen.has(u.id)) seen.set(u.id, u);
    }
    return Array.from(seen.values());
  }, [topics]);

  const topicOptions = useMemo(() => {
    if (!unit) return topics;
    return topics.filter((t) => {
      const u = unitFromTopic(t);
      return u?.id === unit;
    });
  }, [topics, unit]);

  // Prefill subject/topic from URL once both lists have loaded.
  useEffect(() => {
    if (prefilled) return;
    if (!subjects.length) return;
    const subjectParam = searchParams.get('subjectId') || '';
    const topicParam = searchParams.get('topicId') || '';
    if (!subjectParam && !topicParam) {
      setPrefilled(true);
      return;
    }
    if (subjectParam) setSubject(subjectParam);
    // topic is set once its subject's topics have loaded.
    if (topicParam && (!subjectParam || subjectParam === subject) && topics.length) {
      const match = topics.find((t) => String(t.id || t._id) === topicParam);
      if (match) {
        setTopic(topicParam);
        const u = unitFromTopic(match);
        if (u?.id) setUnit(u.id);
      }
      setPrefilled(true);
    } else if (!topicParam) {
      setPrefilled(true);
    }
  }, [prefilled, subjects, topics, subject, searchParams]);

  const generateMutation = useMutation({
    mutationFn: (payload) => notesService.generate(payload),
    onSuccess: (data) => {
      const note = data?.note || data;
      const id = note?.id || note?._id;
      notifySuccess('Notes generated', 'Opening your notes now.');
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      if (id) navigate(`/app/notes/${id}`, { replace: true });
      else navigate('/app/notes', { replace: true });
    },
    onError: (error) => toastError(error, 'Could not generate the notes.'),
  });

  const canSubmit = Boolean(subject) && Boolean(format) && !generateMutation.isPending;

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    generateMutation.mutate({
      subject,
      unit: unit || undefined,
      topic: topic || undefined,
      format,
      prompt: prompt.trim() || undefined,
    });
  };

  const importGfgMutation = useMutation({
    mutationFn: (payload) => notesService.importGfg(payload),
    onSuccess: (data) => {
      const id = data?.id || data?._id;
      notifySuccess('GeeksforGeeks Notes Imported', 'Opening your notes now.');
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      if (id) navigate(`/app/notes/${id}`, { replace: true });
      else navigate('/app/notes', { replace: true });
    },
    onError: (error) => toastError(error, 'Could not fetch GeeksforGeeks notes.'),
  });

  const handleGfgFetch = () => {
    const selectedSubjObj = subjects.find((s) => (s.id || s._id) === subject);
    const selectedTopicObj = topics.find((t) => (t.id || t._id) === topic);
    const topicTitle = selectedTopicObj?.title || prompt.trim() || selectedSubjObj?.name || 'Computer Science Topic';

    importGfgMutation.mutate({
      topicTitle,
      subjectName: selectedSubjObj?.name || 'BCA Curriculum',
      subjectCode: selectedSubjObj?.code || '',
      format,
    });
  };

  const busy = generateMutation.isPending || importGfgMutation.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Study notes engine"
        icon={Sparkles}
        title="Notes Generator & GeeksforGeeks Library"
        description="Pick a topic and format to generate exam-ready notes or fetch comprehensive notes directly from GeeksforGeeks."
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate('/app/notes')}>
            <ArrowLeft className="size-4" /> Back to library
          </Button>
        }
      />

      <div className="rounded-xl border border-brand/20 bg-brand/5 p-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-brand text-white text-xs font-bold">
            GFG
          </span>
          <div>
            <p className="text-[13.5px] font-semibold text-ink">GeeksforGeeks Notes Integration Active</p>
            <p className="text-[12px] text-ink-muted">
              Fetch curated articles, code examples, time complexity tables, and revision summaries for all BCA subjects.
            </p>
          </div>
        </div>
        <Badge variant="mint" size="sm">
          Instant Syllabus Notes
        </Badge>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <FormGrid>
              <Field label="Subject" htmlFor="note-subject" required>
                {subjectsQuery.isLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select
                    value={subject || 'none'}
                    onValueChange={(value) => {
                      const next = value === 'none' ? '' : value;
                      setSubject(next);
                      setUnit('');
                      setTopic('');
                    }}
                  >
                    <SelectTrigger id="note-subject">
                      <SelectValue placeholder="Choose a subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.length === 0 ? (
                        <SelectItem value="none" disabled>
                          No subjects available
                        </SelectItem>
                      ) : (
                        subjects.map((s) => (
                          <SelectItem key={s.id || s._id} value={String(s.id || s._id)}>
                            {subjectName(s)}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                )}
              </Field>

              <Field label="Unit" htmlFor="note-unit" hint="Optional — narrow the scope to one unit.">
                <Select
                  value={unit || 'none'}
                  onValueChange={(value) => {
                    setUnit(value === 'none' ? '' : value);
                    setTopic('');
                  }}
                  disabled={!subject || !units.length}
                >
                  <SelectTrigger id="note-unit">
                    <SelectValue placeholder={units.length ? 'All units' : 'Select a subject first'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">All units</SelectItem>
                    {units.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Topic" htmlFor="note-topic" hint="Focus the notes on a single topic.">
                <Select
                  value={topic || 'none'}
                  onValueChange={(value) => setTopic(value === 'none' ? '' : value)}
                  disabled={!subject || topicsQuery.isLoading || !topicOptions.length}
                >
                  <SelectTrigger id="note-topic">
                    <SelectValue placeholder={topicOptions.length ? 'All topics' : 'No topics available'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">All topics</SelectItem>
                    {topicOptions.map((t) => (
                      <SelectItem key={t.id || t._id} value={String(t.id || t._id)}>
                        {t.title || t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Format" htmlFor="note-format" required>
                <Select value={format} onValueChange={setFormat}>
                  <SelectTrigger id="note-format">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMAT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </FormGrid>

            <Field
              label="Custom prompt"
              htmlFor="note-prompt"
              hint="Optional — add focus points, emphasis or style instructions for the AI."
            >
              <Textarea
                id="note-prompt"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="e.g. Include formulas with examples and keep it under 800 words."
                rows={4}
                maxLength={1000}
              />
            </Field>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-canvas-deep px-4 py-3">
              <div className="flex items-center gap-2.5">
                <Sparkles className="size-4 text-brand" />
                <p className="text-[13px] text-ink-muted">
                  Output format: <span className="font-medium text-ink">{humaniseKey(format)}</span>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGfgFetch}
                  disabled={busy}
                  className="border-brand/40 text-brand hover:bg-brand/10"
                >
                  {importGfgMutation.isPending ? <Spinner size={16} /> : <BookOpen className="size-4" />}
                  <span>{importGfgMutation.isPending ? 'Fetching…' : '🌐 Fetch from GeeksforGeeks'}</span>
                </Button>

                <Button type="submit" disabled={!canSubmit || busy} className="min-w-[10rem]">
                  {generateMutation.isPending ? <Spinner size={16} className="text-white" /> : <Wand2 className="size-4" />}
                  {generateMutation.isPending ? 'Generating…' : 'Generate notes'}
                </Button>
              </div>
            </div>

          </form>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-ink-muted">
        <BookOpen className="size-3.5" />
        <span>Need something different?</span>
        <Badge variant="outline" size="sm" className="inline-flex items-center gap-1">
          <ListTree className="size-3" /> 12 note formats
        </Badge>
      </div>
    </div>
  );
}
