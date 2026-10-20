import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  Clock3,
  GraduationCap,
  Layers,
  Plus,
  PlusCircle,
  Search,
  Sparkles,
  Target,
  Trash2,
} from 'lucide-react';
import { academicService } from '../../services/academic.service';
import { studentService } from '../../services/student.service';
import { qk } from '../../lib/queryClient';
import { notifySuccess, toastError } from '../../lib/notify';
import { useAuthStore } from '../../stores/authStore';
import { useDocumentTitle } from '../../hooks/use-document-title';
import { useListParams } from '../../hooks/use-list-params';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Progress } from '../../components/ui/progress';
import { Checkbox } from '../../components/ui/checkbox';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Textarea } from '../../components/ui/textarea';
import { Skeleton, SkeletonCards } from '../../components/ui/skeleton';
import { EmptyState, ErrorState, NotConfigured } from '../../components/ui/empty-state';
import { Field, FormGrid } from '../../components/common/form';
import { SearchInput } from '../../components/common/search-input';
import { Pagination } from '../../components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { ACCENT_CLASSES, accentFor, cn, formatPercent, humaniseKey } from '../../lib/utils';

/* Mirrors LEARNING_LEVELS in server/src/config/constants.js */
const LEARNING_LEVELS = ['beginner', 'intermediate', 'advanced'];

const STEP_META = [
  { title: 'Academic identity', description: 'Tell us where you study so we match the right syllabus.' },
  { title: 'Semester', description: 'Which semester are you in this academic year?' },
  { title: 'Subjects', description: 'Enrol in library subjects or build your own custom subject.' },
  { title: 'Study preferences', description: 'Set your study rhythm, targets and review everything.' },
];

const identitySchema = z.object({
  university: z.string().min(1, 'Select your university.'),
  college: z.string().optional().default(''),
  program: z.string().min(1, 'Select your program.'),
  regulation: z.string().min(1, 'Select your regulation.'),
});

const semesterSchema = z.object({
  academicYear: z.string().max(20).optional().default(''),
  currentSemesterNumber: z.coerce.number().min(1, 'Pick a semester.').max(8, 'Semesters run from 1 to 8.'),
  semester: z.string().optional().default(''),
  examDate: z.string().optional().default(''),
});

const preferencesSchema = z.object({
  dailyStudyHours: z.coerce
    .number()
    .min(0.25, 'Give yourself at least 15 minutes a day.')
    .max(12, 'That is more than 12 hours a day.'),
  preferredStudyStartTime: z.string().optional().default(''),
  targetGrade: z.string().max(20).optional().default(''),
  targetPercentage: z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? undefined : value),
    z.coerce.number().min(0, 'Cannot be negative.').max(100, 'Maximum is 100.').optional()
  ),
  knowledgeLevel: z.enum(LEARNING_LEVELS, { message: 'Choose your current level.' }),
});

const idOf = (value) => value?.id || value?._id || '';
const orUndefined = (value) => (value ? value : undefined);

function applyZodErrors(result, setError) {
  result.error.issues.forEach((issue) => {
    const path = issue.path.join('.') || 'root';
    setError(path, { type: 'manual', message: issue.message });
  });
}

function SelectField({ control, name, label, placeholder, options, disabled, loading, required, hint, error, numeric }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Field label={label} htmlFor={name} error={error} hint={hint} required={required}>
          <Select
            value={field.value === '' || field.value === undefined || field.value === null ? undefined : String(field.value)}
            onValueChange={(value) => field.onChange(numeric ? Number(value) : value)}
            disabled={disabled || loading}
          >
            <SelectTrigger id={name} invalid={Boolean(error)} aria-label={label}>
              <SelectValue placeholder={loading ? 'Loading…' : placeholder || `Select ${label}`} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={String(option.value)} value={String(option.value)}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}
    />
  );
}

function StepIndicator({ step, onSelect }) {
  return (
    <ol className="flex flex-wrap items-center gap-2">
      {STEP_META.map((meta, index) => {
        const number = index + 1;
        const done = number < step;
        const active = number === step;
        return (
          <li key={meta.title}>
            <button
              type="button"
              onClick={() => done && onSelect(number)}
              disabled={!done}
              aria-current={active ? 'step' : undefined}
              className={cn(
                'flex items-center gap-2 rounded-xl border px-3 py-1.5 text-[12.5px] font-medium transition-colors',
                active && 'border-brand bg-lavender-soft text-brand',
                done && 'border-line bg-surface text-ink-soft hover:border-line-strong',
                !active && !done && 'border-line bg-surface text-ink-faint'
              )}
            >
              <span
                className={cn(
                  'flex size-5 items-center justify-center rounded-full text-[11px] font-semibold',
                  active ? 'bg-brand text-white' : done ? 'bg-mint-soft text-mint-ink' : 'bg-canvas-deep text-ink-faint'
                )}
              >
                {done ? <Check className="size-3" /> : number}
              </span>
              <span className="hidden sm:inline">{meta.title}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export default function Onboarding() {
  useDocumentTitle('Set up your profile');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const refresh = useAuthStore((state) => state.refresh);

  const [step, setStep] = useState(1);
  const [stepError, setStepError] = useState('');

  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState({});
  const [customEnabled, setCustomEnabled] = useState(false);
  const [custom, setCustom] = useState({
    name: '',
    code: '',
    credits: 4,
    description: '',
    units: [{ title: '', description: '', topics: [{ title: '', description: '' }] }],
  });
  const [customPushed, setCustomPushed] = useState(false);

  const { control, register, watch, setValue, getValues, setError, clearErrors, formState } = useForm({
    defaultValues: {
      university: '',
      college: '',
      program: '',
      regulation: '',
      academicYear: '',
      currentSemesterNumber: 1,
      semester: '',
      examDate: '',
      dailyStudyHours: 2,
      preferredStudyStartTime: '18:00',
      targetGrade: '',
      targetPercentage: 75,
      knowledgeLevel: 'beginner',
    },
  });
  const { errors } = formState;

  const university = watch('university');
  const program = watch('program');
  const regulation = watch('regulation');
  const currentSemesterNumber = watch('currentSemesterNumber');
  const semesterId = watch('semester');

  useEffect(() => {
    setValue('college', '');
    setValue('program', '');
    setValue('regulation', '');
    setValue('semester', '');
  }, [university, setValue]);

  useEffect(() => {
    setValue('regulation', '');
    setValue('semester', '');
  }, [program, setValue]);

  useEffect(() => {
    setValue('semester', '');
  }, [regulation, setValue]);

  const catalogueQuery = useQuery({
    queryKey: qk.catalogue({ university: university || '', program: program || '' }),
    queryFn: () => academicService.catalogue({ university: orUndefined(university), program: orUndefined(program) }),
    staleTime: 5 * 60_000,
  });

  const semestersQuery = useQuery({
    queryKey: qk.semesters({ regulation: regulation || '', program: program || '' }),
    queryFn: () => academicService.semesters({ regulation: orUndefined(regulation), program: orUndefined(program) }),
    enabled: Boolean(regulation || program),
  });

  const { params, setParams } = useListParams({ defaults: { limit: 12 } });
  const subjectsQuery = useQuery({
    queryKey: qk.academicSubjects({
      search: params.search || '',
      page: params.page,
      limit: params.limit,
      semester: semesterId || '',
      semesterNumber: semesterId ? '' : currentSemesterNumber,
    }),
    queryFn: () =>
      academicService.subjects({
        page: params.page,
        limit: params.limit,
        search: orUndefined(params.search),
        semester: orUndefined(semesterId),
        semesterNumber: semesterId ? undefined : currentSemesterNumber,
      }),
    enabled: step === 3,
    placeholderData: keepPreviousData,
  });

  const saveProfile = useMutation({ mutationFn: (payload) => studentService.updateProfile(payload) });
  const addEnrollments = useMutation({ mutationFn: (payload) => studentService.addEnrollments(payload) });
  const finishOnboarding = useMutation({ mutationFn: () => studentService.completeOnboarding({}) });

  const catalogue = catalogueQuery.data;
  const universityOptions = (catalogue?.universities || []).map((entry) => ({ value: idOf(entry), label: entry.name }));
  const collegeOptions = (catalogue?.colleges || []).map((entry) => ({ value: idOf(entry), label: entry.name }));
  const programOptions = (catalogue?.programs || []).map((entry) => ({ value: idOf(entry), label: entry.name }));
  const regulationOptions = (catalogue?.regulations || []).map((entry) => ({
    value: idOf(entry),
    label: entry.year ? `${entry.name} (${entry.year})` : entry.name,
  }));
  const semesterOptions = (semestersQuery.data || []).map((entry) => ({
    value: idOf(entry),
    label: entry.title ? `Semester ${entry.number} · ${entry.title}` : `Semester ${entry.number}`,
  }));

  const catalogueEmpty = catalogueQuery.isSuccess && (catalogue?.universities?.length || 0) === 0;
  const collegesExist = collegeOptions.length > 0;

  const subjects = subjectsQuery.data?.data || [];
  const meta = subjectsQuery.data?.meta;

  const toggleSubject = (subject) => {
    const id = idOf(subject);
    setSelectedIds((current) => (current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]));
    setSelectedSubjects((current) => {
      if (current[id]) {
        const next = { ...current };
        delete next[id];
        return next;
      }
      return { ...current, [id]: { name: subject.name, code: subject.code } };
    });
  };

  const updateCustom = (patch) => setCustom((current) => ({ ...current, ...patch }));
  const updateUnit = (index, patch) =>
    setCustom((current) => ({
      ...current,
      units: current.units.map((unit, i) => (i === index ? { ...unit, ...patch } : unit)),
    }));
  const addUnit = () =>
    setCustom((current) => ({
      ...current,
      units: [...current.units, { title: '', description: '', topics: [{ title: '', description: '' }] }],
    }));
  const removeUnit = (index) =>
    setCustom((current) => ({ ...current, units: current.units.filter((_, i) => i !== index) }));
  const updateTopic = (unitIndex, topicIndex, patch) =>
    setCustom((current) => ({
      ...current,
      units: current.units.map((unit, i) =>
        i === index
          ? { ...unit, topics: unit.topics.map((topic, j) => (j === topicIndex ? { ...topic, ...patch } : topic)) }
          : unit
      ),
    }));
  const addTopic = (unitIndex) =>
    setCustom((current) => ({
      ...current,
      units: current.units.map((unit, i) =>
        i === unitIndex ? { ...unit, topics: [...unit.topics, { title: '', description: '' }] } : unit
      ),
    }));
  const removeTopic = (unitIndex, topicIndex) =>
    setCustom((current) => ({
      ...current,
      units: current.units.map((unit, i) =>
        i === unitIndex ? { ...unit, topics: unit.topics.filter((_, j) => j !== topicIndex) } : unit
      ),
    }));

  const reviewItems = useMemo(() => {
    const findName = (list, id) => (list || []).find((entry) => idOf(entry) === id)?.name || '—';
    return [
      { label: 'University', value: findName(catalogue?.universities, university) },
      { label: 'College', value: collegeOptions.length ? findName(catalogue?.colleges, watch('college')) : 'Not applicable' },
      { label: 'Program', value: findName(catalogue?.programs, program) },
      { label: 'Regulation', value: findName(catalogue?.regulations, regulation) },
      {
        label: 'Semester',
        value: semesterId
          ? semesterOptions.find((option) => option.value === semesterId)?.label || `Semester ${currentSemesterNumber}`
          : `Semester ${currentSemesterNumber}`,
      },
      { label: 'Subjects', value: `${selectedIds.length} selected${customEnabled && custom.name.trim() ? ' + 1 custom' : ''}` },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogue, university, program, regulation, semesterId, currentSemesterNumber, selectedIds, customEnabled, custom.name]);

  const customIsValid = custom.name.trim().length >= 2;
  const hasSubjectChoice = selectedIds.length > 0 || (customEnabled && customIsValid);

  const saveIdentity = async () => {
    const values = getValues();
    const result = identitySchema.safeParse(values);
    if (!result.success) {
      applyZodErrors(result, setError);
      return false;
    }
    if (collegesExist && !values.college) {
      setError('college', { type: 'manual', message: 'Select your college.' });
      return false;
    }
    await saveProfile.mutateAsync({
      university: values.university,
      college: orUndefined(values.college),
      program: values.program,
      regulation: values.regulation,
      onboardingStep: 2,
    });
    return true;
  };

  const saveSemester = async () => {
    const values = getValues();
    const result = semesterSchema.safeParse(values);
    if (!result.success) {
      applyZodErrors(result, setError);
      return false;
    }
    await saveProfile.mutateAsync({
      currentSemesterNumber: Number(values.currentSemesterNumber),
      academicYear: values.academicYear || '',
      onboardingStep: 3,
    });
    return true;
  };

  const saveSubjects = async () => {
    if (customEnabled && !customIsValid) {
      setStepError('Give your custom subject a name before continuing.');
      return false;
    }
    if (!hasSubjectChoice) {
      setStepError('Add at least one subject or create a custom subject before continuing.');
      return false;
    }
    const values = getValues();
    const payload = {
      subjectIds: selectedIds,
      semester: orUndefined(semesterId),
      regulation: orUndefined(regulation),
      academicYear: values.academicYear || '',
      examDate: orUndefined(values.examDate),
    };
    if (customEnabled && !customPushed) {
      payload.customSubject = {
        name: custom.name.trim(),
        code: custom.code.trim() || undefined,
        credits: Number(custom.credits) || 4,
        semesterNumber: Number(values.currentSemesterNumber) || 1,
        description: custom.description.trim() || undefined,
        units: custom.units
          .filter((unit) => unit.title.trim())
          .map((unit) => ({
            title: unit.title.trim(),
            description: unit.description.trim() || undefined,
            topics: unit.topics
              .filter((topic) => topic.title.trim())
              .map((topic) => ({ title: topic.title.trim(), description: topic.description.trim() || undefined })),
          })),
      };
    }
    if (!payload.subjectIds.length && !payload.customSubject) {
      setStepError('Add at least one subject or create a custom subject before continuing.');
      return false;
    }
    await addEnrollments.mutateAsync(payload);
    if (payload.customSubject) setCustomPushed(true);
    return true;
  };

  const finish = async () => {
    const values = getValues();
    const result = preferencesSchema.safeParse(values);
    if (!result.success) {
      applyZodErrors(result, setError);
      return;
    }
    try {
      await saveProfile.mutateAsync({
        studyPreferences: {
          knowledgeLevel: values.knowledgeLevel,
          dailyStudyMinutes: Math.round(Number(values.dailyStudyHours) * 60),
          preferredStudyStartTime: values.preferredStudyStartTime || '',
          targetGrade: values.targetGrade || '',
          targetPercentage:
            values.targetPercentage === '' || values.targetPercentage === undefined
              ? undefined
              : Number(values.targetPercentage),
        },
        onboardingStep: 4,
      });
      await finishOnboarding.mutateAsync();
      queryClient.invalidateQueries({ queryKey: qk.profile });
      queryClient.invalidateQueries({ queryKey: qk.enrollments });
      queryClient.invalidateQueries({ queryKey: ['student', 'subjects'] });
      await refresh();
      notifySuccess('Your profile is ready', 'We have generated your first study plan.');
      navigate('/app', { replace: true });
    } catch (error) {
      toastError(error, 'We could not finish onboarding.');
    }
  };

  const saving = saveProfile.isPending || addEnrollments.isPending || finishOnboarding.isPending;

  const goNext = async () => {
    clearErrors();
    setStepError('');
    try {
      if (step === 1 && (await saveIdentity())) setStep(2);
      else if (step === 2 && (await saveSemester())) setStep(3);
      else if (step === 3 && (await saveSubjects())) setStep(4);
    } catch (error) {
      const fieldErrors = error?.fieldErrors || {};
      Object.entries(fieldErrors).forEach(([path, message]) => setError(path, { type: 'server', message }));
      toastError(error, 'We could not save that step. Please review the form.');
    }
  };

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-20 border-b border-line bg-canvas/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-2.5 px-4 sm:px-6">
          <span className="flex size-9 items-center justify-center rounded-xl bg-brand text-white shadow-sm">
            <GraduationCap className="size-[18px]" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-ink">BCA SmartLearn AI</span>
          <Badge variant="lavender" className="ml-auto">
            Step {step} of {STEP_META.length}
          </Badge>
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">Profile setup</p>
          <span className="text-[12px] text-ink-muted">{formatPercent(((step - 1) / STEP_META.length) * 100)} complete</span>
        </div>
        <Progress value={((step - 1) / STEP_META.length) * 100} tone="brand" />
        <div className="mt-4">
          <StepIndicator step={step} onSelect={setStep} />
        </div>

        <div className="mt-7">
          <h1 className="text-[22px] font-semibold tracking-tight text-ink">{STEP_META[step - 1].title}</h1>
          <p className="mt-1 text-[13.5px] leading-relaxed text-ink-muted">{STEP_META[step - 1].description}</p>
        </div>

        <div className="mt-6 space-y-5">
          {step === 1 ? (
            <Card>
              <CardContent className="p-5">
                {catalogueQuery.isError && !catalogueQuery.data ? (
                  catalogueQuery.error?.notConfigured ? (
                    <NotConfigured message={catalogueQuery.error.message} envKey={catalogueQuery.error.envKey} />
                  ) : (
                    <ErrorState error={catalogueQuery.error} onRetry={catalogueQuery.refetch} />
                  )
                ) : catalogueQuery.isLoading ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <Skeleton key={index} className="h-16" />
                    ))}
                  </div>
                ) : catalogueEmpty ? (
                  <EmptyState
                    preset="empty"
                    title="The academic catalogue is not ready yet"
                    description="Your administrator has not added universities, programs and regulations. Ask them to seed the catalogue, then reload this step."
                    action={
                      <Button variant="outline" size="sm" onClick={() => catalogueQuery.refetch()}>
                        Check again
                      </Button>
                    }
                  />
                ) : (
                  <FormGrid columns={2}>
                    <SelectField
                      control={control}
                      name="university"
                      label="University"
                      options={universityOptions}
                      placeholder="Select your university"
                      required
                      error={errors.university?.message}
                    />
                    <SelectField
                      control={control}
                      name="college"
                      label="College"
                      options={collegeOptions}
                      placeholder={university ? 'Select your college' : 'Choose a university first'}
                      disabled={!university}
                      required={collegesExist}
                      error={errors.college?.message}
                      hint={!collegesExist && university ? 'No colleges are listed for this university.' : undefined}
                    />
                    <SelectField
                      control={control}
                      name="program"
                      label="Program"
                      options={programOptions}
                      placeholder={university ? 'Select your program' : 'Choose a university first'}
                      disabled={!university}
                      required
                      error={errors.program?.message}
                    />
                    <SelectField
                      control={control}
                      name="regulation"
                      label="Regulation"
                      options={regulationOptions}
                      placeholder={program ? 'Select your regulation' : 'Choose a program first'}
                      disabled={!program}
                      required
                      error={errors.regulation?.message}
                    />
                  </FormGrid>
                )}
              </CardContent>
            </Card>
          ) : null}

          {step === 2 ? (
            <Card>
              <CardContent className="p-5">
                <FormGrid columns={2}>
                  <Field label="Academic year" htmlFor="academicYear" hint="For example, 2024-25">
                    <Input id="academicYear" placeholder="2024-25" {...register('academicYear')} />
                  </Field>
                  <SelectField
                    control={control}
                    name="currentSemesterNumber"
                    label="Current semester"
                    numeric
                    required
                    options={Array.from({ length: 8 }).map((_, index) => ({
                      value: index + 1,
                      label: `Semester ${index + 1}`,
                    }))}
                    error={errors.currentSemesterNumber?.message}
                  />
                  <SelectField
                    control={control}
                    name="semester"
                    label="Semester record (optional)"
                    options={semesterOptions}
                    placeholder={
                      semestersQuery.isLoading
                        ? 'Loading semesters…'
                        : semesterOptions.length
                          ? 'Match it to a regulation semester'
                          : 'Not linked to a regulation semester'
                    }
                    loading={semestersQuery.isLoading}
                    disabled={!semesterOptions.length}
                    error={errors.semester?.message}
                  />
                  <Field
                    label="First exam date (optional)"
                    htmlFor="examDate"
                    error={errors.examDate?.message}
                    hint="We use this to build your study plan."
                  >
                    <Input id="examDate" type="date" {...register('examDate')} />
                  </Field>
                </FormGrid>
              </CardContent>
            </Card>
          ) : null}

          {step === 3 ? (
            <div className="space-y-5">
              <Card>
                <CardHeader className="flex-row items-center justify-between gap-3">
                  <div>
                    <CardTitle>Library subjects</CardTitle>
                    <p className="mt-0.5 text-[12.5px] text-ink-muted">
                      Semester {currentSemesterNumber} · {selectedIds.length} selected
                    </p>
                  </div>
                  <SearchInput
                    className="w-full sm:w-64"
                    value={params.search}
                    onChange={(value) => setParams({ search: value })}
                    placeholder="Search subjects…"
                    aria-label="Search library subjects"
                  />
                </CardHeader>
                <CardContent>
                  {subjectsQuery.isLoading ? (
                    <SkeletonCards count={6} heights={[172, 200, 186, 210, 178, 194]} className="xl:grid-cols-2" />
                  ) : subjectsQuery.isError ? (
                    subjectsQuery.error?.notConfigured ? (
                      <NotConfigured message={subjectsQuery.error.message} envKey={subjectsQuery.error.envKey} />
                    ) : (
                      <ErrorState error={subjectsQuery.error} onRetry={subjectsQuery.refetch} />
                    )
                  ) : subjects.length === 0 ? (
                    <EmptyState
                      compact
                      preset={params.search ? 'search' : 'empty'}
                      title={params.search ? `No subjects match “${params.search}”` : 'No library subjects for this semester'}
                      description={
                        params.search
                          ? 'Try a different keyword, or clear the search.'
                          : 'Create a custom subject below to build your own units and topics.'
                      }
                    />
                  ) : (
                    <>
                      <div className="grid gap-3.5 sm:grid-cols-2">
                        {subjects.map((subject) => {
                          const id = idOf(subject);
                          const selected = selectedIds.includes(id);
                          const tone = ACCENT_CLASSES[accentFor(subject.name)] || ACCENT_CLASSES.lavender;
                          return (
                            <label
                              key={id}
                              className={cn(
                                'card-surface card-interactive flex cursor-pointer flex-col overflow-hidden rounded-2xl',
                                selected && 'border-brand ring-2 ring-brand/20'
                              )}
                            >
                              <div className={cn('relative flex h-14 items-center justify-center', tone.bg)}>
                                <BookOpen className={cn('size-5', tone.ink, 'opacity-80')} />
                              </div>
                              <div className="flex items-start gap-3 p-3.5">
                                <Checkbox
                                  checked={selected}
                                  onCheckedChange={() => toggleSubject(subject)}
                                  aria-label={`Select ${subject.name}`}
                                  className="mt-0.5"
                                />
                                <div className="min-w-0">
                                  <p className="truncate text-[13.5px] font-semibold text-ink">{subject.name}</p>
                                  <p className="text-[12px] text-ink-muted">
                                    {subject.code || 'No code'} · {subject.credits ?? 0} credits · {humaniseKey(subject.type || 'theory')}
                                  </p>
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                      <Pagination
                        meta={meta}
                        className="mt-4"
                        onPageChange={(page) => setParams({ page })}
                        onLimitChange={(limit) => setParams({ limit })}
                      />
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex-row items-center justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <PlusCircle className="size-4 text-ink-muted" /> Create a custom subject
                    </CardTitle>
                    <p className="mt-0.5 text-[12.5px] text-ink-muted">
                      Build your own units and topics when the library does not cover it.
                    </p>
                  </div>
                  <Switch
                    checked={customEnabled}
                    onCheckedChange={setCustomEnabled}
                    aria-label="Enable custom subject builder"
                  />
                </CardHeader>
                {customEnabled ? (
                  <CardContent className="space-y-5">
                    <FormGrid columns={2}>
                      <Field label="Subject name" htmlFor="custom-name" required error={stepError && !customIsValid ? stepError : undefined}>
                        <Input
                          id="custom-name"
                          value={custom.name}
                          onChange={(event) => updateCustom({ name: event.target.value })}
                          placeholder="e.g. Advanced Web Technologies"
                        />
                      </Field>
                      <Field label="Subject code" htmlFor="custom-code">
                        <Input
                          id="custom-code"
                          value={custom.code}
                          onChange={(event) => updateCustom({ code: event.target.value })}
                          placeholder="e.g. BCA-501"
                        />
                      </Field>
                      <Field label="Credits" htmlFor="custom-credits">
                        <Input
                          id="custom-credits"
                          type="number"
                          min={0}
                          max={20}
                          value={custom.credits}
                          onChange={(event) => updateCustom({ credits: event.target.value })}
                        />
                      </Field>
                      <Field label="Description" htmlFor="custom-description">
                        <Input
                          id="custom-description"
                          value={custom.description}
                          onChange={(event) => updateCustom({ description: event.target.value })}
                          placeholder="Optional summary"
                        />
                      </Field>
                    </FormGrid>

                    <div className="space-y-3">
                      {custom.units.map((unit, unitIndex) => (
                        <div key={unitIndex} className="rounded-xl border border-line bg-surface p-3.5">
                          <div className="flex items-center gap-2">
                            <Layers className="size-4 text-ink-muted" />
                            <span className="text-[12.5px] font-semibold text-ink">Unit {unitIndex + 1}</span>
                            {custom.units.length > 1 ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="iconSm"
                                className="ml-auto text-ink-muted hover:text-danger"
                                onClick={() => removeUnit(unitIndex)}
                                aria-label={`Remove unit ${unitIndex + 1}`}
                              >
                                <Trash2 />
                              </Button>
                            ) : null}
                          </div>
                          <Input
                            className="mt-2"
                            value={unit.title}
                            onChange={(event) => updateUnit(unitIndex, { title: event.target.value })}
                            placeholder="Unit title"
                            aria-label={`Unit ${unitIndex + 1} title`}
                          />
                          <div className="mt-2 space-y-2">
                            {unit.topics.map((topic, topicIndex) => (
                              <div key={topicIndex} className="flex items-center gap-2">
                                <Input
                                  value={topic.title}
                                  onChange={(event) => updateTopic(unitIndex, topicIndex, { title: event.target.value })}
                                  placeholder={`Topic ${topicIndex + 1}`}
                                  aria-label={`Unit ${unitIndex + 1} topic ${topicIndex + 1}`}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="iconSm"
                                  onClick={() => removeTopic(unitIndex, topicIndex)}
                                  aria-label={`Remove topic ${topicIndex + 1}`}
                                >
                                  <Trash2 />
                                </Button>
                              </div>
                            ))}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="mt-2"
                            onClick={() => addTopic(unitIndex)}
                          >
                            <Plus className="size-3.5" /> Add topic
                          </Button>
                        </div>
                      ))}
                      <Button type="button" variant="outline" size="sm" onClick={addUnit}>
                        <Plus className="size-4" /> Add unit
                      </Button>
                    </div>
                  </CardContent>
                ) : null}
              </Card>

              {stepError ? (
                <p className="rounded-xl bg-danger-soft px-3 py-2 text-[12.5px] font-medium text-danger">{stepError}</p>
              ) : null}
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-5">
              <Card>
                <CardContent className="p-5">
                  <FormGrid columns={2}>
                    <Field
                      label="Daily study hours"
                      htmlFor="dailyStudyHours"
                      required
                      error={errors.dailyStudyHours?.message}
                      hint="We spread your topics across this much time each day."
                    >
                      <Input
                        id="dailyStudyHours"
                        type="number"
                        step={0.5}
                        min={0.25}
                        max={12}
                        {...register('dailyStudyHours')}
                      />
                    </Field>
                    <Field label="Preferred study time" htmlFor="preferredStudyStartTime">
                      <Input id="preferredStudyStartTime" type="time" {...register('preferredStudyStartTime')} />
                    </Field>
                    <SelectField
                      control={control}
                      name="knowledgeLevel"
                      label="Current learning level"
                      required
                      options={LEARNING_LEVELS.map((level) => ({ value: level, label: humaniseKey(level) }))}
                      error={errors.knowledgeLevel?.message}
                    />
                    <Field label="Target grade" htmlFor="targetGrade" error={errors.targetGrade?.message}>
                      <Input id="targetGrade" placeholder="e.g. A+" {...register('targetGrade')} />
                    </Field>
                    <Field
                      label="Target percentage"
                      htmlFor="targetPercentage"
                      error={errors.targetPercentage?.message}
                      hint="Your aim for the semester overall."
                    >
                      <Input id="targetPercentage" type="number" min={0} max={100} {...register('targetPercentage')} />
                    </Field>
                  </FormGrid>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="size-4 text-ink-muted" /> Review your setup
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {reviewItems.map((item) => (
                      <div key={item.label} className="flex items-center justify-between rounded-xl bg-canvas-deep px-3 py-2.5">
                        <span className="text-[12.5px] text-ink-muted">{item.label}</span>
                        <span className="text-[13px] font-semibold text-ink">{item.value}</span>
                      </div>
                    ))}
                  </div>
                  {(selectedIds.length ? Object.values(selectedSubjects) : []).length ? (
                    <div className="rounded-xl border border-line bg-surface p-3">
                      <p className="mb-2 flex items-center gap-2 text-[12.5px] font-semibold text-ink">
                        <BookOpen className="size-3.5" /> Enrolled subjects
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.values(selectedSubjects).map((entry, index) => (
                          <Badge key={index} variant="sky" size="sm">
                            {entry.name}
                          </Badge>
                        ))}
                        {customEnabled && customIsValid ? (
                          <Badge variant="mint" size="sm">
                            {custom.name} (custom)
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                  <div className="flex flex-wrap gap-4 pt-1 text-[12.5px] text-ink-muted">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock3 className="size-3.5" /> {watch('dailyStudyHours')} h / day
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="size-3.5" /> Semester {currentSemesterNumber}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Target className="size-3.5" /> {watch('targetGrade') || 'No target grade'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </div>

        <div className="mt-8 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={() => setStep((current) => Math.max(1, current - 1))}
            disabled={step === 1 || saving}
          >
            <ArrowLeft className="size-4" /> Back
          </Button>

          {step < 4 ? (
            <Button onClick={goNext} disabled={saving || (step === 1 && catalogueEmpty)}>
              {saving ? 'Saving…' : 'Continue'} <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button onClick={finish} disabled={saving}>
              {saving ? 'Finishing…' : 'Finish setup'} <Check className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
