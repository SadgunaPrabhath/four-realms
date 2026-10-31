/* Number & text formatting helpers. */

export function fmt(n) {
  n = Math.round(n);
  if (Math.abs(n) < 1000) return String(n);
  const units = ['', 'K', 'M', 'B', 'T'];
  let u = 0;
  let v = n;
  while (Math.abs(v) >= 1000 && u < units.length - 1) { v /= 1000; u++; }
  return (v >= 100 ? Math.round(v) : v.toFixed(1).replace(/\.0$/, '')) + units[u];
}

export function signed(n) { return (n >= 0 ? '+' : '') + fmt(n); }

export function pct(v) { return Math.round(v * 100) + '%'; }

export function fmtTime(sec) {
  sec = Math.floor(sec);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function ago(ts) {
  const d = Date.now() - ts;
  const min = Math.floor(d / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

export function title(s) { return s.replace(/\b\w/g, (c) => c.toUpperCase()); }

export function plural(n, word, suffix = 's') { return `${n} ${word}${n === 1 ? '' : suffix}`; }
