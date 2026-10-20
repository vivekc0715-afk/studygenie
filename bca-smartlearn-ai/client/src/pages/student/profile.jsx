import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Building2,
  CalendarDays,
  Check,
  Clock3,
  GraduationCap,
  Mail,
  Pencil,
  Target,
  UserRound,
  X,
} from 'lucide-react';
import { studentService } from '../../services/student.service';
import { qk } from '../../lib/queryClient';
import { notifySuccess, toastError } from '../../lib/notify';
import { useAuthStore } from '../../stores/authStore';
import { useDocumentTitle } from '../../hooks/use-document-title';
import { PageHeader } from '../../components/common/page-header';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { EmptyState, ErrorState } from '../../components/ui/empty-state';
import { Field, FormGrid } from '../../components/common/form';
import { Input } from '../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { cn, formatPercent, humaniseKey } from '../../lib/utils';

const LEARNING_LEVELS = ['beginner', 'intermediate', 'advanced'];

const profileSchema = z.object({
  currentSemesterNumber: z.coerce
    .number()
    .min(1, 'Pick a semester.')
    .max(12, 'Semesters run from 1 to 12.'),
  academicYear: z.string().max(20).optional().default(''),
  examDate: z.string().optional().default(''),
  dailyStudyMinutes: z.coerce
    .number()
    .min(15, 'Give yourself at least 15 minutes a day.')
    .max(720, 'That is more than 12 hours a day.'),
  preferredStudyStartTime: z.string().optional().default(''),
  targetGrade: z.string().max(20).optional().default(''),
  targetPercentage: z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? undefined : value),
    z.coerce.number().min(0, 'Cannot be negative.').max(100, 'Maximum is 100.').optional()
  ),
  knowledgeLevel: z.enum(LEARNING_LEVELS, { message: 'Choose your current level.' }),
});

function applyZodErrors(result, setError) {
  result.error.issues.forEach((issue) => {
    const path = issue.path.join('.') || 'root';
    setError(path, { type: 'manual', message: issue.message });
  });
}

function SelectField({ control, name, label, placeholder, options, disabled, required, hint, error, numeric }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Field label={label} htmlFor={name} error={error} hint={hint} required={required}>
          <Select
            value={field.value === '' || field.value === undefined || field.value === null ? undefined : String(field.value)}
            onValueChange={(value) => field.onChange(numeric ? Number(value) : value)}
            disabled={disabled}
          >
            <SelectTrigger id={name} invalid={Boolean(error)} aria-label={label}>
              <SelectValue placeholder={placeholder || `Select ${label}`} />
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

function InfoRow({ label, value, icon: Icon, tone = 'neutral' }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-canvas-deep px-3 py-2.5">
      {Icon ? <Icon className="mt-0.5 size-4 shrink-0 text-ink-faint" /> : null}
      <div className="min-w-0 flex-1">
        <p className="text-[11.5px] uppercase tracking-wide text-ink-faint">{label}</p>
        <p className={cn('mt-0.5 text-[13.5px] font-semibold', tone === 'muted' ? 'text-ink-soft' : 'text-ink')}>
          {value || '—'}
        </p>
      </div>
    </div>
  );
}

export default function AcademicProfile() {
  useDocumentTitle('Academic Profile');
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const [editing, setEditing] = useState(false);

  const profileQuery = useQuery({
    queryKey: qk.profile,
    queryFn: () => studentService.getProfile(),
  });

  const updateProfile = useMutation({
    mutationFn: (payload) => studentService.updateProfile(payload),
    onSuccess: () => {
      notifySuccess('Profile updated', 'Your academic details have been saved.');
      queryClient.invalidateQueries({ queryKey: qk.profile });
      queryClient.invalidateQueries({ queryKey: qk.me });
      setEditing(false);
    },
    onError: (error) => toastError(error, 'We could not update your profile.'),
  });

  const profile = profileQuery.data?.profile;

  const {
    control,
    register,
    handleSubmit,
    setValue,
    setError,
    clearErrors,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      currentSemesterNumber: 1,
      academicYear: '',
      examDate: '',
      dailyStudyMinutes: 120,
      preferredStudyStartTime: '18:00',
      targetGrade: '',
      targetPercentage: 75,
      knowledgeLevel: 'beginner',
    },
  });

  // Sync form values whenever we enter edit mode with fresh profile data.
  useEffect(() => {
    if (!editing || !profile) return;
    reset({
      currentSemesterNumber: profile.currentSemesterNumber ?? 1,
      academicYear: profile.academicYear || '',
      examDate: profile.examDate ? new Date(profile.examDate).toISOString().slice(0, 10) : '',
      dailyStudyMinutes: profile.studyPreferences?.dailyStudyMinutes ?? 120,
      preferredStudyStartTime: profile.studyPreferences?.preferredStudyStartTime || '18:00',
      targetGrade: profile.studyPreferences?.targetGrade || '',
      targetPercentage: profile.studyPreferences?.targetPercentage ?? 75,
      knowledgeLevel: profile.studyPreferences?.knowledgeLevel || 'beginner',
    });
  }, [editing, profile, reset]);

  const onSubmit = (values) => {
    const result = profileSchema.safeParse(values);
    if (!result.success) {
      applyZodErrors(result, setError);
      return;
    }
    const payload = {
      currentSemesterNumber: Number(values.currentSemesterNumber),
      academicYear: values.academicYear || '',
      examDate: values.examDate || undefined,
      studyPreferences: {
        knowledgeLevel: values.knowledgeLevel,
        dailyStudyMinutes: Math.round(Number(values.dailyStudyMinutes)),
        preferredStudyStartTime: values.preferredStudyStartTime || '',
        targetGrade: values.targetGrade || '',
        targetPercentage:
          values.targetPercentage === '' || values.targetPercentage === undefined
            ? undefined
            : Number(values.targetPercentage),
      },
    };
    updateProfile.mutate(payload);
  };

  const cancelEdit = () => {
    clearErrors();
    setEditing(false);
  };

  const dailyHours = profile?.studyPreferences?.dailyStudyMinutes
    ? (profile.studyPreferences.dailyStudyMinutes / 60).toFixed(profile.studyPreferences.dailyStudyMinutes % 60 === 0 ? 0 : 1)
    : '—';

  return (
    <div className="space-y-6">
      <PageHeader
        icon={UserRound}
        title="Academic Profile"
        description="Your identity, semester and study preferences."
        actions={
          editing ? (
            <>
              <Button variant="outline" size="sm" onClick={cancelEdit} disabled={updateProfile.isPending}>
                <X className="size-4" /> Cancel
              </Button>
              <Button size="sm" onClick={handleSubmit(onSubmit)} disabled={updateProfile.isPending}>
                {updateProfile.isPending ? 'Saving…' : 'Save changes'} <Check className="size-4" />
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(true)}
              disabled={profileQuery.isLoading || profileQuery.isError}
            >
              <Pencil className="size-4" /> Edit profile
            </Button>
          )
        }
      />

      {profileQuery.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-48" />
          ))}
        </div>
      ) : profileQuery.isError ? (
        <ErrorState error={profileQuery.error} onRetry={profileQuery.refetch} />
      ) : !profile ? (
        <EmptyState title="Profile not available" description="We could not load your profile. Please try again." />
      ) : editing ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Academic identity (read-only in edit mode) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="size-4 text-ink-muted" /> Academic identity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FormGrid columns={2}>
                <Field label="University" htmlFor="university">
                  <Input id="university" value={profile.university?.name || '—'} disabled />
                </Field>
                <Field label="College" htmlFor="college">
                  <Input id="college" value={profile.college?.name || 'Not specified'} disabled />
                </Field>
                <Field label="Program" htmlFor="program">
                  <Input id="program" value={profile.program?.name || '—'} disabled />
                </Field>
                <Field label="Regulation" htmlFor="regulation">
                  <Input
                    id="regulation"
                    value={
                      profile.regulation
                        ? `${profile.regulation.name}${profile.regulation.year ? ` (${profile.regulation.year})` : ''}`
                        : '—'
                    }
                    disabled
                  />
                </Field>
              </FormGrid>
            </CardContent>
          </Card>

          {/* Semester */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="size-4 text-ink-muted" /> Semester
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FormGrid columns={2}>
                <SelectField
                  control={control}
                  name="currentSemesterNumber"
                  label="Current semester"
                  numeric
                  required
                  options={Array.from({ length: 12 }).map((_, index) => ({
                    value: index + 1,
                    label: `Semester ${index + 1}`,
                  }))}
                  error={errors.currentSemesterNumber?.message}
                />
                <Field
                  label="Academic year"
                  htmlFor="academicYear"
                  error={errors.academicYear?.message}
                  hint="For example, 2024-25"
                >
                  <Input id="academicYear" placeholder="2024-25" {...register('academicYear')} />
                </Field>
                <Field label="First exam date (optional)" htmlFor="examDate" hint="We use this to build your study plan.">
                  <Input id="examDate" type="date" {...register('examDate')} />
                </Field>
              </FormGrid>
            </CardContent>
          </Card>

          {/* Study preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="size-4 text-ink-muted" /> Study preferences
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FormGrid columns={2}>
                <Field
                  label="Daily study minutes"
                  htmlFor="dailyStudyMinutes"
                  required
                  error={errors.dailyStudyMinutes?.message}
                  hint="We spread your topics across this much time each day."
                >
                  <Input
                    id="dailyStudyMinutes"
                    type="number"
                    min={15}
                    max={720}
                    step={5}
                    {...register('dailyStudyMinutes')}
                  />
                </Field>
                <Field label="Preferred study start time" htmlFor="preferredStudyStartTime">
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

          {/* Account */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserRound className="size-4 text-ink-muted" /> Account
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FormGrid columns={2}>
                <Field label="Name" htmlFor="name">
                  <Input id="name" value={user?.name || '—'} disabled />
                </Field>
                <Field label="Email" htmlFor="email">
                  <Input id="email" value={user?.email || '—'} disabled />
                </Field>
              </FormGrid>
            </CardContent>
          </Card>
        </form>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Academic identity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="size-4 text-ink-muted" /> Academic identity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <InfoRow label="University" value={profile.university?.name} icon={Building2} />
              <InfoRow label="College" value={profile.college?.name || 'Not specified'} />
              <InfoRow label="Program" value={profile.program?.name} />
              <InfoRow
                label="Regulation"
                value={
                  profile.regulation
                    ? `${profile.regulation.name}${profile.regulation.year ? ` (${profile.regulation.year})` : ''}`
                    : '—'
                }
              />
            </CardContent>
          </Card>

          {/* Semester */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="size-4 text-ink-muted" /> Semester
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <InfoRow label="Current semester" value={`Semester ${profile.currentSemesterNumber ?? '—'}`} />
              <InfoRow label="Academic year" value={profile.academicYear || 'Not specified'} />
              <InfoRow
                label="First exam date"
                value={profile.examDate ? new Date(profile.examDate).toLocaleDateString() : 'Not set'}
              />
              {profileQuery.data?.enrollmentCount !== undefined ? (
                <div className="flex items-center justify-between rounded-xl bg-canvas-deep px-3 py-2.5">
                  <span className="text-[11.5px] uppercase tracking-wide text-ink-faint">Enrolled subjects</span>
                  <Badge variant="sky" size="sm">
                    {profileQuery.data.enrollmentCount}
                  </Badge>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Study preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="size-4 text-ink-muted" /> Study preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <InfoRow label="Daily study" value={`${dailyHours} h`} icon={Clock3} />
              <InfoRow
                label="Preferred start time"
                value={profile.studyPreferences?.preferredStudyStartTime || 'Not set'}
              />
              <InfoRow label="Learning level" value={humaniseKey(profile.studyPreferences?.knowledgeLevel || 'beginner')} />
              <InfoRow label="Target grade" value={profile.studyPreferences?.targetGrade || 'Not set'} />
              <InfoRow
                label="Target percentage"
                value={
                  profile.studyPreferences?.targetPercentage !== undefined
                    ? formatPercent(profile.studyPreferences.targetPercentage)
                    : 'Not set'
                }
              />
            </CardContent>
          </Card>

          {/* Account */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserRound className="size-4 text-ink-muted" /> Account
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <InfoRow label="Name" value={user?.name} />
              <InfoRow label="Email" value={user?.email} icon={Mail} />
              <InfoRow label="Role" value={humaniseKey(user?.role || 'student')} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
