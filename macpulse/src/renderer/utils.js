export const fmtBytes = (n, d = 1) => {
  if (n == null || isNaN(n)) return '—';
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(i ? d : 0)} ${u[i]}`;
};
export const fmtRate = n => `${fmtBytes(n)}/s`;
export const pct = (n, d = 0) => (n == null ? '—' : `${n.toFixed(d)}%`);
export const colorFor = (v, warn = 70, crit = 90) => (v >= crit ? 'var(--bad)' : v >= warn ? 'var(--warn)' : 'var(--good)');
