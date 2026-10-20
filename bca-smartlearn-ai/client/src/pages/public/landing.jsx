import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  CalendarClock,
  ClipboardCheck,
  Code2,
  GraduationCap,
  LineChart,
  NotebookText,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Youtube,
} from 'lucide-react';
import { academicService } from '../../services/academic.service';
import { useAuthStore } from '../../stores/authStore';
import { useDocumentTitle } from '../../hooks/use-document-title';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent } from '../../components/ui/card';
import { MasonryGrid } from '../../components/common/masonry-grid';
import { ACCENT_CLASSES, formatNumber } from '../../lib/utils';

const FEATURES = [
  {
    icon: Sparkles,
    accent: 'lavender',
    title: 'AI notes in seconds',
    body: 'Generate exam-ready notes in 12 formats — one-liners, long answers, flashcards, formula sheets — grounded in your own syllabus units and topics.',
  },
  {
    icon: Code2,
    accent: 'sky',
    title: 'C / Java / Python compiler',
    body: 'Write, run and debug code in a sandboxed execution service with real stdin, custom test cases and instant output.',
  },
  {
    icon: ClipboardCheck,
    accent: 'mint',
    title: 'Adaptive tests',
    body: 'Quizzes that pick difficulty from your measured mastery, then explain every answer once you submit.',
  },
  {
    icon: LineChart,
    accent: 'peach',
    title: 'Mastery analytics',
    body: 'Topic-level mastery bands, accuracy trends, confidence and syllabus coverage — no vanity metrics.',
  },
  {
    icon: Target,
    accent: 'butter',
    title: 'Grade prediction',
    body: 'A transparent baseline model blends recent scores, coding success and coverage against your university grading scheme.',
  },
  {
    icon: Youtube,
    accent: 'blush',
    title: 'Curated video lessons',
    body: 'Recommendations chosen from YouTube based on the exact topic you are weakest at right now.',
  },
  {
    icon: CalendarClock,
    accent: 'lavender',
    title: 'Adaptive study planner',
    body: 'A day-by-day timetable built from exam dates, difficulty weightings and how much you have already covered.',
  },
  {
    icon: BookOpen,
    accent: 'sky',
    title: 'Your syllabus, your way',
    body: 'Enrol in library subjects or create a fully custom subject with your own units and topics.',
  },
];

const STUDENT_POINTS = [
  'Personalised dashboard with today’s plan and weak topics',
  'Saved notes library with bookmarks and PDF/Markdown export',
  'Coding exercise library with hidden test cases',
  'Test history with per-question review and explanations',
  'Progress analytics with real recommendation actions',
  'Study planner you can reschedule and tick off',
];

const ADMIN_POINTS = [
  'Full CRUD over universities, colleges, programs and regulations',
  'Manage semesters, subjects, units, topics and syllabi',
  'Question bank, tests, coding exercises and note templates',
  'Grading schemes, curated videos and AI prompt settings',
  'Student account lifecycle: activate, suspend, soft delete',
  'Audit logs, AI usage and system health monitoring',
];

function FeatureCard({ feature }) {
  const Icon = feature.icon;
  const tone = ACCENT_CLASSES[feature.accent] || ACCENT_CLASSES.lavender;
  return (
    <Card interactive className="overflow-hidden">
      <CardContent className="p-5">
        <span className={`mb-3 flex size-10 items-center justify-center rounded-xl ${tone.soft}`}>
          <Icon className={`size-[18px] ${tone.ink}`} />
        </span>
        <h3 className="text-[15px] font-semibold text-ink">{feature.title}</h3>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">{feature.body}</p>
      </CardContent>
    </Card>
  );
}

function PreviewCard({ card }) {
  const tone = ACCENT_CLASSES[card.accent] || ACCENT_CLASSES.lavender;
  const Icon = card.icon;
  return (
    <Card interactive className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center gap-2">
          <span className={`flex size-8 items-center justify-center rounded-lg ${tone.soft}`}>
            <Icon className={`size-4 ${tone.ink}`} />
          </span>
          <Badge variant={card.accent} size="sm">
            {card.tag}
          </Badge>
        </div>
        <p className="mt-3 text-[13.5px] font-semibold text-ink">{card.title}</p>
        <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-muted">{card.body}</p>
      </CardContent>
    </Card>
  );
}

export default function Landing() {
  useDocumentTitle('Personalised learning for BCA students', { suffix: 'BCA SmartLearn AI' });
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const { data: catalogue } = useQuery({
    queryKey: ['academic', 'catalogue', 'landing'],
    queryFn: () => academicService.catalogue({}),
    staleTime: 5 * 60_000,
  });

  const stats = [
    { label: 'Universities', value: catalogue?.universities?.length },
    { label: 'Programs', value: catalogue?.programs?.length },
    { label: 'Regulations', value: catalogue?.regulations?.length },
    { label: 'Grading schemes', value: catalogue?.gradingSchemes?.length },
  ].filter((entry) => typeof entry.value === 'number');

  const handleQuickStudentAccess = async () => {
    if (user) {
      navigate(user.role === 'super_admin' ? '/admin' : '/app');
      return;
    }
    try {
      await useAuthStore.getState().loginAsDemo('student');
      navigate('/app');
    } catch {
      navigate('/login');
    }
  };

  const primary = user
    ? { onClick: () => navigate(user.role === 'super_admin' ? '/admin' : '/app'), label: 'Open dashboard' }
    : { onClick: handleQuickStudentAccess, label: '⚡ Explore as Student (Instant Access)' };

  return (
    <div className="min-h-screen bg-canvas">
      {/* ------------------------------------------------------------ nav */}
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-brand text-white shadow-sm">
              <GraduationCap className="size-[18px]" />
            </span>
            <span className="text-[15px] font-semibold tracking-tight text-ink">BCA SmartLearn AI</span>
          </Link>
          <nav className="ml-auto hidden items-center gap-1 md:flex">
            <a
              href="#features"
              className="rounded-lg px-3 py-2 text-[13.5px] font-medium text-ink-soft transition-colors hover:bg-canvas-deep hover:text-ink"
            >
              Features
            </a>
            <a
              href="#roles"
              className="rounded-lg px-3 py-2 text-[13.5px] font-medium text-ink-soft transition-colors hover:bg-canvas-deep hover:text-ink"
            >
              Roles
            </a>
          </nav>
          <div className="ml-auto flex items-center gap-2 md:ml-0">
            {user ? null : (
              <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                Sign in
              </Button>
            )}
            <Button size="sm" onClick={primary.onClick}>
              {primary.label}
            </Button>
          </div>
        </div>
      </header>

      {/* ----------------------------------------------------------- hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -left-24 top-[-6rem] size-[26rem] rounded-full bg-lavender/55 blur-3xl" />
          <div className="absolute right-[-8rem] top-16 size-[22rem] rounded-full bg-sky/45 blur-3xl" />
          <div className="absolute bottom-[-10rem] left-1/3 size-[24rem] rounded-full bg-mint/40 blur-3xl" />
        </div>

        <div className="mx-auto max-w-6xl px-4 pb-14 pt-14 sm:px-6 sm:pb-20 sm:pt-20">
          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <Badge variant="lavender" className="mb-4">
                <Sparkles className="size-3" /> Built for Bachelor of Computer Applications
              </Badge>
              <h1 className="text-[34px] font-semibold leading-[1.1] tracking-tight text-ink sm:text-[46px]">
                Study smarter with a platform that actually knows your syllabus.
              </h1>
              <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-ink-soft">
                BCA SmartLearn AI turns your university syllabus into AI notes, sandboxed coding practice, adaptive tests, and a
                grade forecast that shows its working — with full GeeksforGeeks notes & instant student access.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Button size="lg" onClick={primary.onClick}>
                  {primary.label} <ArrowRight className="size-4" />
                </Button>
                {user ? null : (
                  <Button size="lg" variant="outline" onClick={() => navigate('/login')}>
                    Sign in options
                  </Button>
                )}
              </div>

              {stats.length ? (
                <dl className="mt-9 grid max-w-lg grid-cols-2 gap-4 sm:grid-cols-4">
                  {stats.map((entry) => (
                    <div key={entry.label}>
                      <dt className="text-[11.5px] uppercase tracking-wide text-ink-faint">{entry.label}</dt>
                      <dd className="text-[20px] font-semibold text-ink">{formatNumber(entry.value)}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </div>

            {/* preview stack — mirrors the real masonry card language */}
            <div className="relative">
              <div className="grid gap-3.5 sm:grid-cols-2">
                {[
                  { icon: BrainCircuit, accent: 'lavender', title: 'Unit 3 — Normalisation', body: 'AI note · 1NF → BCNF with worked examples', tag: 'AI notes' },
                  { icon: Code2, accent: 'sky', title: 'Reverse a linked list', body: 'Java · 12 tests passed in 0.42s', tag: 'Compiler' },
                  { icon: Target, accent: 'butter', title: 'Predicted: A+', body: 'Database Systems · 88% confidence (high)', tag: 'Grade' },
                  { icon: ClipboardCheck, accent: 'mint', title: 'Adaptive quiz', body: '10 questions · difficulty raised to medium', tag: 'Tests' },
                  { icon: LineChart, accent: 'peach', title: 'Mastery map', body: '4 topics mastered, 3 need revision', tag: 'Analytics' },
                  { icon: Youtube, accent: 'blush', title: 'Recommended lesson', body: 'Joins & subqueries — 18 min', tag: 'Videos' },
                ].map((card) => (
                  <PreviewCard key={card.title} card={card} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- features */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="mb-8 max-w-2xl">
          <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">Everything in one place</p>
          <h2 className="mt-2 text-[26px] font-semibold tracking-tight text-ink sm:text-[32px]">
            Nine connected tools, one syllabus
          </h2>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">
            Each feature feeds the next: notes inform tests, tests measure mastery, mastery drives your planner and your grade
            forecast.
          </p>
        </div>

        <MasonryGrid>
          {FEATURES.map((feature) => (
            <FeatureCard key={feature.title} feature={feature} />
          ))}
        </MasonryGrid>
      </section>

      {/* ---------------------------------------------------------- roles */}
      <section id="roles" className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="border-lavender bg-lavender-soft">
            <CardContent className="p-6">
              <span className="flex size-10 items-center justify-center rounded-xl bg-white text-brand">
                <Users className="size-[18px]" />
              </span>
              <h3 className="mt-4 text-[19px] font-semibold text-ink">For students</h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-soft">
                A daily workspace built around what you actually need to study today.
              </p>
              <ul className="mt-4 space-y-2">
                {STUDENT_POINTS.map((point) => (
                  <li key={point} className="flex items-start gap-2.5 text-[13px] text-ink-soft">
                    <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-brand" />
                    {point}
                  </li>
                ))}
              </ul>
              <Button className="mt-5" onClick={() => navigate(user ? '/app' : '/register')}>
                {user ? 'Open student area' : 'Create student account'}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-line">
            <CardContent className="p-6">
              <span className="flex size-10 items-center justify-center rounded-xl bg-canvas-deep text-ink-soft">
                <ShieldCheck className="size-[18px]" />
              </span>
              <h3 className="mt-4 text-[19px] font-semibold text-ink">Super Admin</h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-soft">
                Run the platform: structure the syllabus, curate content and monitor activity.
              </p>
              <ul className="mt-4 space-y-2">
                {ADMIN_POINTS.map((point) => (
                  <li key={point} className="flex items-start gap-2.5 text-[13px] text-ink-soft">
                    <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-ink-faint" />
                    {point}
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="mt-5" onClick={() => navigate(user?.role === 'super_admin' ? '/admin' : '/login')}>
                {user?.role === 'super_admin' ? 'Open admin console' : 'Admin sign in'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* --------------------------------------------------------- footer */}
      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-brand text-white">
              <GraduationCap className="size-4" />
            </span>
            <div>
              <p className="text-[13.5px] font-semibold text-ink">BCA SmartLearn AI</p>
              <p className="text-[11.5px] text-ink-muted">Personalised learning & academic performance platform</p>
            </div>
          </div>
          <p className="text-[11.5px] text-ink-faint">
            Notes are AI-assisted. Always cross-check with your official university syllabus.
          </p>
        </div>
      </footer>
    </div>
  );
}
