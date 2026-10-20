import { Link } from 'react-router-dom';
import { BrainCircuit, Code2, GraduationCap, LineChart, NotebookText } from 'lucide-react';
import { Card } from '../ui/card';
import { cn } from '../../lib/utils';

const HIGHLIGHTS = [
  {
    icon: NotebookText,
    accent: 'bg-lavender text-lavender-ink',
    text: 'AI notes in 12 exam-ready formats, grounded in your own syllabus units.',
  },
  {
    icon: Code2,
    accent: 'bg-sky text-sky-ink',
    text: 'Sandboxed C, Java and Python compiler with real test cases.',
  },
  {
    icon: BrainCircuit,
    accent: 'bg-mint text-mint-ink',
    text: 'Adaptive tests that pick difficulty from your measured mastery.',
  },
  {
    icon: LineChart,
    accent: 'bg-peach text-peach-ink',
    text: 'Grade prediction and mastery analytics that show their working.',
  },
];

/**
 * Shared split-screen shell for every auth screen.
 * Left: pastel brand panel (hidden below `lg`). Right: centred form card.
 */
export function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen bg-canvas lg:grid lg:grid-cols-2">
      {/* ------------------------------------------------- left: brand panel */}
      <aside className="relative hidden overflow-hidden border-r border-line bg-canvas-deep lg:flex lg:flex-col">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute -left-24 top-0 size-[26rem] rounded-full bg-lavender blur-3xl" />
          <div className="absolute -right-20 top-1/3 size-[22rem] rounded-full bg-peach blur-3xl" />
          <div className="absolute bottom-[-6rem] left-10 size-[20rem] rounded-full bg-mint blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 size-[16rem] rounded-full bg-butter blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-1 flex-col justify-between p-10 xl:p-14">
          <Link to="/login" className="flex items-center gap-2.5">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-brand text-white shadow-sm">
              <GraduationCap className="size-5" />
            </span>
            <span className="text-[15px] font-semibold tracking-tight text-ink">BCA SmartLearn AI</span>
          </Link>

          <div className="max-w-md">
            <h2 className="text-[30px] font-semibold leading-[1.15] tracking-tight text-ink xl:text-[34px]">
              Study smarter with a platform that knows your syllabus.
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-ink-soft">
              Turn your university syllabus into notes, sandboxed code practice, adaptive tests and a grade
              forecast — all tuned to your semester.
            </p>
            <ul className="mt-7 space-y-3.5">
              {HIGHLIGHTS.map(({ icon: Icon, accent, text }) => (
                <li key={text} className="flex items-start gap-3">
                  <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-xl', accent)}>
                    <Icon className="size-[18px]" />
                  </span>
                  <span className="pt-1 text-[13.5px] leading-snug text-ink-soft">{text}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-[11.5px] leading-relaxed text-ink-faint">
            Notes are AI-assisted. Always cross-check with your official university syllabus.
          </p>
        </div>
      </aside>

      {/* ------------------------------------------------ right: form panel */}
      <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-md">
          <Link to="/login" className="mb-7 flex items-center justify-center gap-2.5 lg:hidden">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-brand text-white shadow-sm">
              <GraduationCap className="size-5" />
            </span>
            <span className="text-[15px] font-semibold tracking-tight text-ink">BCA SmartLearn AI</span>
          </Link>

          <Card className="p-6 sm:p-8">
            <header className="space-y-1.5">
              <h1 className="text-[22px] font-semibold tracking-tight text-ink">{title}</h1>
              {subtitle ? <p className="text-[13.5px] leading-relaxed text-ink-muted">{subtitle}</p> : null}
            </header>
            <div className="mt-6">{children}</div>
          </Card>

          {footer ? <div className="mt-5 text-center text-[13px] text-ink-muted">{footer}</div> : null}
        </div>
      </main>
    </div>
  );
}

export default AuthLayout;
