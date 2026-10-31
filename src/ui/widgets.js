/* ============================================================
   Shared UI widgets — building blocks reused by every screen.
   ============================================================ */
import { h } from '../engine/dom.js';
import { sfx } from '../engine/audio.js';
import { fmt, signed } from '../engine/format.js';

/** A top bar for menu/mode screens with a back button + title + actions. */
export function topBar({ title, subtitle, onBack, actions = [], accent } = {}) {
  return h('header.topbar', { style: accent ? `--realm:${accent}` : '' },
    onBack && h('button.icon-btn', { onclick: onBack, 'aria-label': 'Back' }, '‹'),
    h('div.col', { style: 'gap:0' },
      h('div.topbar-title', title),
      subtitle && h('div.tiny.faint', subtitle),
    ),
    h('div.grow'),
    h('div.row.gap-2', ...actions),
  );
}

/** Resource / stat pill with optional delta + flash on change. */
export function statPill({ icon, label, value, delta, id, mono = true }) {
  const node = h('div.stat', { id },
    icon && h('span.ico', icon),
    h('div.col', { style: 'gap:0' },
      label && h('span.lbl', label),
      h('span', { class: mono ? 'val' : '' }, typeof value === 'number' ? fmt(value) : value),
    ),
    (delta !== undefined && delta !== 0) && h('span', { class: 'delta ' + (delta > 0 ? 'pos' : 'neg') }, signed(delta)),
  );
  return node;
}

/** Meter/bar with label. kind: hp|stamina|hunger|xp|happy|realm */
export function meter({ label, value, max = 100, kind = 'realm', showNums = true, thin = false }) {
  const p = Math.max(0, Math.min(1, max ? value / max : 0));
  return h(`div.meter${thin ? '.meter-thin' : ''}`,
    (label || showNums) && h('div.meter-head',
      h('span', label || ''),
      showNums && h('span.mono', `${Math.round(value)}/${Math.round(max)}`),
    ),
    h('div.meter-track', h('div', { class: `meter-fill ${kind}`, style: `width:${p * 100}%` })),
  );
}

/** Section header with fancy rule. */
export function section(titleText, right) {
  return h('div.section-head',
    h('h3', titleText),
    right || null,
  );
}

/** A labelled choice button (events/dialogue). */
export function choiceBtn({ label, hint, cost, disabled, onClick, tag }) {
  return h('button.choice', { disabled, onclick: (e) => { if (!disabled) { sfx('click'); onClick?.(e); } } },
    h('div.row', { style: 'justify-content:space-between;align-items:flex-start;gap:12px' },
      h('div.grow',
        h('div.c-label', label),
        hint && h('div.c-hint', hint),
      ),
      cost && h('div.c-cost', cost),
      tag && h('span.tag', tag),
    ),
  );
}

/** Empty state block. */
export function empty(icon, text, sub) {
  return h('div.empty', h('div.e-ico', icon), h('div', text), sub && h('div.tiny.faint', { style: 'margin-top:6px' }, sub));
}

/** Small labelled key/value row. */
export function kv(label, value, cls = '') {
  return h('div.row', { class: 'kv ' + cls, style: 'justify-content:space-between;gap:12px;padding:4px 0;border-bottom:1px solid var(--hairline)' },
    h('span.muted.small', label),
    h('span.small', { style: 'color:var(--text-strong);font-weight:600' }, value),
  );
}

/** Star rating / difficulty pips. */
export function pips(n, total = 5, char = '◆') {
  return h('span', { style: 'letter-spacing:2px' },
    h('span', { style: 'color:var(--realm)' }, char.repeat(Math.max(0, n))),
    h('span', { style: 'color:var(--text-faint)' }, char.repeat(Math.max(0, total - n))),
  );
}
