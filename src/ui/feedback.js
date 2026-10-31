/* ============================================================
   Shared feedback UI: toasts, modals, confirm dialogs,
   particle bursts and screen shake.
   ============================================================ */
import { h, mount, clear } from '../engine/dom.js';
import { sfx } from '../engine/audio.js';
import { state } from '../engine/store.js';

/* ---------------- Toasts ---------------- */
export function toast(opts) {
  const { title = '', body = '', icon = '', type = 'default', duration = 3800, sound } = typeof opts === 'string' ? { body: opts } : opts;
  const layer = document.getElementById('toast-layer');
  if (!layer) return;
  if (sound) sfx(sound);
  const el = h(`div.toast.${type}`,
    icon && h('div.t-ico', icon),
    h('div.grow',
      title && h('div.t-title', title),
      body && h('div.t-body', body),
    ),
  );
  layer.appendChild(el);
  // cap toasts
  while (layer.children.length > 5) layer.firstChild.remove();
  const kill = () => { el.classList.add('out'); setTimeout(() => el.remove(), 400); };
  const timer = setTimeout(kill, duration);
  el.addEventListener('click', () => { clearTimeout(timer); kill(); });
  return el;
}

export function achievementToast(ach) {
  toast({ type: 'achievement', icon: ach.icon || '🏆', title: 'Achievement Unlocked', body: ach.name, duration: 5000, sound: 'achievement' });
}

/* ---------------- Modal ---------------- */
let modalStack = [];

export function modal({ title = '', body, actions = [], wide = false, dismissable = true, onClose } = {}) {
  const layer = document.getElementById('modal-layer');
  layer.style.pointerEvents = 'auto';

  const close = (result) => {
    backdrop.remove();
    modalStack = modalStack.filter((m) => m !== backdrop);
    if (!modalStack.length) layer.style.pointerEvents = 'none';
    onClose?.(result);
  };

  const bodyNode = typeof body === 'function' ? body(close) : body;
  const modalEl = h(`div.modal${wide ? '.wide' : ''}`,
    title && h('div.panel-head', h('div.panel-title', title), dismissable && h('button.icon-btn', { onclick: () => { sfx('back'); close(); }, 'aria-label': 'Close' }, '✕')),
    h('div.modal-body', bodyNode),
    actions.length && h('div.modal-foot', ...actions.map((a) =>
      h(`button.btn${a.primary ? '.primary' : ''}${a.danger ? '.danger' : ''}${a.class ? '.' + a.class : ''}`, {
        onclick: () => { sfx(a.sound || 'click'); const keep = a.onClick?.(close); if (!keep) close(a.value); },
        disabled: a.disabled,
      }, a.label),
    )),
  );
  const backdrop = h('div.modal-backdrop', {
    onclick: (e) => { if (e.target === backdrop && dismissable) { sfx('back'); close(); } },
  }, modalEl);
  layer.appendChild(backdrop);
  modalStack.push(backdrop);
  return { close, el: modalEl };
}

export function confirm({ title = 'Are you sure?', message = '', confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false } = {}) {
  return new Promise((resolve) => {
    modal({
      title,
      body: h('div', h('p.serif', { style: 'font-size:1.05rem;color:var(--text-dim)' }, message)),
      dismissable: true,
      onClose: (r) => resolve(r === true),
      actions: [
        { label: cancelLabel, sound: 'back', onClick: (close) => { close(false); return true; } },
        { label: confirmLabel, primary: !danger, danger, sound: 'confirm', onClick: (close) => { close(true); return true; } },
      ],
    });
  });
}

/* ---------------- Particles & shake ---------------- */
export function burst(x, y, { count = 14, color = 'var(--realm)', spread = 80, emoji } = {}) {
  if (state.settings && !state.settings.particles) return;
  const layer = document.getElementById('fx-layer');
  if (!layer) return;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    const ang = (Math.PI * 2 * i) / count + Math.random();
    const dist = spread * (0.5 + Math.random());
    const dx = Math.cos(ang) * dist;
    const dy = Math.sin(ang) * dist - 20;
    p.style.cssText = `position:fixed;left:${x}px;top:${y}px;pointer-events:none;z-index:9500;font-size:${emoji ? '1.1rem' : '6px'};`;
    if (emoji) p.textContent = emoji;
    else { p.style.width = p.style.height = 6 + Math.random() * 4 + 'px'; p.style.background = color; p.style.borderRadius = '50%'; p.style.boxShadow = `0 0 8px ${color}`; }
    layer.appendChild(p);
    p.animate([
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      { transform: `translate(${dx}px,${dy + 60}px) scale(0.2)`, opacity: 0 },
    ], { duration: 700 + Math.random() * 400, easing: 'cubic-bezier(0.16,1,0.3,1)' }).onfinish = () => p.remove();
  }
}

export function burstAt(el, opts) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2, opts);
}

export function shake(el = document.getElementById('app'), intensity = 1) {
  if (state.settings && !state.settings.screenShake) return;
  el?.classList.remove('shake');
  void el?.offsetWidth;
  el?.classList.add('shake');
  setTimeout(() => el?.classList.remove('shake'), 450);
}

/** Floating combat/number text at an element. */
export function floatText(el, text, { color = 'var(--text-strong)', crit = false } = {}) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  const layer = document.getElementById('fx-layer');
  const t = h('div', { style: `position:fixed;left:${r.left + r.width / 2}px;top:${r.top}px;transform:translateX(-50%);z-index:9500;pointer-events:none;font-family:var(--font-display);font-weight:800;color:${color};font-size:${crit ? '1.8rem' : '1.2rem'};text-shadow:0 2px 6px #000;` }, text);
  layer.appendChild(t);
  t.animate([
    { transform: 'translate(-50%,0) scale(0.6)', opacity: 0 },
    { transform: 'translate(-50%,-14px) scale(1.1)', opacity: 1, offset: 0.3 },
    { transform: 'translate(-50%,-52px) scale(1)', opacity: 0 },
  ], { duration: 1100, easing: 'cubic-bezier(0.16,1,0.3,1)' }).onfinish = () => t.remove();
}
