import {
  LayoutDashboard,
  Bot,
  BookOpen,
  CalendarRange,
  Sparkles,
  NotebookText,
  Code2,
  TerminalSquare,
  ClipboardCheck,
  LineChart,
  GraduationCap,
  Youtube,
  CalendarClock,
  Bookmark,
  Bell,
  Settings,
  UserRound,
  Building2,
  Users,
  ScrollText,
  Layers,
  ListTree,
  Map,
  FileText,
  Library,
  HelpCircle,
  Award,
  Activity,
  School,
  Trophy,
} from 'lucide-react';

/** Left-rail navigation for the student area. */
export const STUDENT_NAV = [
  {
    label: 'Overview',
    items: [
      { to: '/app', label: 'Home', icon: LayoutDashboard, end: true },
      { to: '/app/planner', label: 'Study Planner', icon: CalendarClock },
      { to: '/app/analytics', label: 'Progress', icon: LineChart },
    ],
  },
  {
    label: 'Academics',
    items: [
      { to: '/app/semester', label: 'Semester Planner', icon: CalendarRange },
      { to: '/app/subjects', label: 'Subjects & Syllabus', icon: BookOpen },
    ],
  },
  {
    label: 'Learn',
    items: [
      { to: '/app/chat', label: 'AI Study Chatbot', icon: Bot },
      { to: '/app/notes/generate', label: 'AI & GFG Notes', icon: Sparkles },
      { to: '/app/notes', label: 'Saved Notes', icon: NotebookText },
      { to: '/app/compiler', label: 'Online Compiler', icon: TerminalSquare },
      { to: '/app/practice', label: 'Coding Practice', icon: Code2 },
      { to: '/app/videos', label: 'Video Lessons', icon: Youtube },
    ],
  },
  {
    label: 'Assess',
    items: [
      { to: '/app/tests', label: 'Tests & Quizzes', icon: ClipboardCheck },
      { to: '/app/results', label: 'Results', icon: Trophy },
      { to: '/app/predictions', label: 'Grade Prediction', icon: GraduationCap },
    ],
  },
  {
    label: 'Library',
    items: [
      { to: '/app/bookmarks', label: 'Bookmarks', icon: Bookmark },
      { to: '/app/notifications', label: 'Notifications', icon: Bell },
      { to: '/app/profile', label: 'Academic Profile', icon: UserRound },
      { to: '/app/settings', label: 'Settings', icon: Settings },
    ],
  },
];

/** Left-rail navigation for the Super Admin area. */
export const ADMIN_NAV = [
  {
    label: 'Platform',
    items: [
      { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/admin/students', label: 'Students', icon: Users },
      { to: '/admin/system-health', label: 'System Health', icon: Activity },
      { to: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText },
      { to: '/admin/settings', label: 'Settings', icon: Settings },
    ],
  },
  {
    label: 'Academic Structure',
    items: [
      { to: '/admin/universities', label: 'Universities', icon: Building2 },
      { to: '/admin/colleges', label: 'Colleges', icon: School },
      { to: '/admin/programs', label: 'Programs', icon: GraduationCap },
      { to: '/admin/regulations', label: 'Regulations', icon: ScrollText },
      { to: '/admin/semesters', label: 'Semesters', icon: CalendarRange },
      { to: '/admin/subjects', label: 'Subjects', icon: BookOpen },
      { to: '/admin/units', label: 'Units', icon: Layers },
      { to: '/admin/topics', label: 'Topics', icon: ListTree },
      { to: '/admin/syllabi', label: 'Syllabi', icon: Map },
    ],
  },
  {
    label: 'Content & Assessment',
    items: [
      { to: '/admin/note-templates', label: 'Note Templates', icon: FileText },
      { to: '/admin/learning-materials', label: 'Learning Materials', icon: Library },
      { to: '/admin/questions', label: 'Question Bank', icon: HelpCircle },
      { to: '/admin/tests', label: 'Tests', icon: ClipboardCheck },
      { to: '/admin/exercises', label: 'Coding Exercises', icon: Code2 },
      { to: '/admin/videos', label: 'Curated Videos', icon: Youtube },
    ],
  },
  {
    label: 'Configuration',
    items: [{ to: '/admin/grading-schemes', label: 'Grading Schemes', icon: Award }],
  },
];

export function navForRole(role) {
  return role === 'super_admin' ? ADMIN_NAV : STUDENT_NAV;
}

export const HOME_FOR_ROLE = { super_admin: '/admin', student: '/app' };
