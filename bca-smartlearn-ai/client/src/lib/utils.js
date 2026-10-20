import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Tailwind-aware className merge. */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/* ---------------------------------------------------------------- dates --- */

export function formatDate(value, options = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', options).format(date);
}

export function formatDateTime(value) {
  return formatDate(value, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatTime(value) {
  return formatDate(value, { hour: 'numeric', minute: '2-digit' });
}

export function relativeTime(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / 60000);
  if (Math.abs(minutes) < 1) return 'just now';
  if (Math.abs(minutes) < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 7) return `${days}d ago`;
  return formatDate(date);
}

export function toDateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayKey() {
  return toDateKey(new Date());
}

/* --------------------------------------------------------------- numbers --- */

export function formatNumber(value, options = {}) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0';
  return new Intl.NumberFormat('en-IN', options).format(number);
}

export function formatPercent(value, digits = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  return `${number.toFixed(digits)}%`;
}

export function formatMinutes(minutes) {
  const total = Number(minutes) || 0;
  if (total < 60) return `${Math.round(total)}m`;
  const hours = Math.floor(total / 60);
  const rest = Math.round(total % 60);
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

export function formatDuration(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/* -------------------------------------------------------------- strings --- */

export function initialsOf(name = '') {
  return (
    String(name)
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || 'S'
  );
}

export function titleCase(value = '') {
  return String(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function humaniseKey(value = '') {
  return titleCase(value);
}

export function truncate(text = '', length = 140) {
  const value = String(text);
  return value.length > length ? `${value.slice(0, length).trimEnd()}…` : value;
}

export function pluralise(count, singular, plural) {
  return Number(count) === 1 ? singular : plural || `${singular}s`;
}

/** Stable pastel accent from any string — keeps cards visually varied but consistent. */
const ACCENTS = ['lavender', 'sky', 'mint', 'peach', 'butter', 'blush'];

export function accentFor(seed = '') {
  let hash = 0;
  const text = String(seed);
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) % 100000;
  }
  return ACCENTS[hash % ACCENTS.length];
}

export const ACCENT_CLASSES = {
  lavender: {
    bg: 'bg-lavender',
    soft: 'bg-lavender-soft',
    ink: 'text-lavender-ink',
    border: 'border-lavender',
  },
  sky: { bg: 'bg-sky', soft: 'bg-sky-soft', ink: 'text-sky-ink', border: 'border-sky' },
  mint: { bg: 'bg-mint', soft: 'bg-mint-soft', ink: 'text-mint-ink', border: 'border-mint' },
  peach: { bg: 'bg-peach', soft: 'bg-peach-soft', ink: 'text-peach-ink', border: 'border-peach' },
  butter: { bg: 'bg-butter', soft: 'bg-butter-soft', ink: 'text-butter-ink', border: 'border-butter' },
  blush: { bg: 'bg-blush', soft: 'bg-blush-soft', ink: 'text-blush-ink', border: 'border-blush' },
};

/* ----------------------------------------------------------------- misc --- */

/** Deterministic gradient placeholder for a subject/card without artwork. */
export function gradientFor(seed = '') {
  const accent = accentFor(seed);
  const map = {
    lavender: 'from-lavender to-sky',
    sky: 'from-sky to-mint',
    mint: 'from-mint to-butter',
    peach: 'from-peach to-butter',
    butter: 'from-butter to-peach',
    blush: 'from-blush to-lavender',
  };
  return map[accent];
}

export function debounce(fn, wait = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

export function download(filename, content, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function toCsv(rows, columns) {
  if (!rows?.length) return '';
  const keys = columns || Object.keys(rows[0]);
  const escape = (value) => {
    const text = value === null || value === undefined ? '' : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const head = keys.map(escape).join(',');
  const body = rows.map((row) => keys.map((key) => escape(row[key])).join(',')).join('\n');
  return `${head}\n${body}`;
}
