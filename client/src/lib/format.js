/** Small formatting helpers — dates and numbers shown in the user's own locale/zone. */

const dayFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' });
const dayYearFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const timeFmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });

export const shortDay = (iso) => (iso ? dayFmt.format(new Date(iso)) : '—');
export const fullDay = (iso) => (iso ? dayYearFmt.format(new Date(iso)) : '—');
export const timeOf = (iso) => (iso ? timeFmt.format(new Date(iso)) : '—');

export function relative(iso) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return fullDay(iso);
}

export const minutes = (n) => {
  const v = Number(n) || 0;
  if (v < 60) return `${v} min`;
  const h = Math.floor(v / 60);
  const m = v % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
};

export const percent = (n) => `${Math.round(Number(n) || 0)}%`;

export const weekdayLabel = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short' });

export const plural = (n, one, many) => `${n} ${n === 1 ? one : many || `${one}s`}`;

export const titleCase = (s) => String(s || '').replace(/(^|\s|-)\w/g, (m) => m.toUpperCase());

export const formatDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

export const formatDuration = (totalSeconds) => {
  const s = Math.max(0, Number(totalSeconds) || 0);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return rest ? `${m}m ${rest}s` : `${m}m`;
};
