/* ============================================================
   Tiny DOM helper — hyperscript-style element creation.
   Keeps UI code declarative without a framework dependency.
   ============================================================ */

/**
 * h('div.class#id', { onclick, style, ... }, children)
 * - tag supports .class and #id shorthand
 * - props: event handlers (onX), style (obj or string), dataset, html (innerHTML), attrs
 * - children: string | node | array (nested/falsey ignored)
 */
export function h(tag = 'div', props = null, ...children) {
  // Allow h(tag, children) signature
  if (props && (typeof props !== 'object' || Array.isArray(props) || props.nodeType)) {
    children = [props, ...children];
    props = null;
  }
  let tagName = 'div';
  const classes = [];
  let id = null;
  const m = tag.match(/^([a-zA-Z0-9]+)?(.*)$/);
  if (m) {
    tagName = m[1] || 'div';
    const rest = m[2] || '';
    rest.replace(/([.#][^.#]+)/g, (tok) => {
      if (tok[0] === '.') classes.push(tok.slice(1));
      else id = tok.slice(1);
      return '';
    });
  }
  const el = document.createElement(tagName);
  if (id) el.id = id;
  if (classes.length) el.className = classes.join(' ');

  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class' || k === 'className') {
        el.className = (el.className ? el.className + ' ' : '') + v;
      } else if (k === 'style') {
        if (typeof v === 'string') el.style.cssText += v;
        else Object.assign(el.style, v);
      } else if (k === 'html') {
        el.innerHTML = v;
      } else if (k === 'dataset') {
        Object.assign(el.dataset, v);
      } else if (k.startsWith('on') && typeof v === 'function') {
        el.addEventListener(k.slice(2).toLowerCase(), v);
      } else if (k === 'ref' && typeof v === 'function') {
        v(el);
      } else if (k in el && k !== 'list') {
        try { el[k] = v; } catch { el.setAttribute(k, v); }
      } else {
        el.setAttribute(k, v);
      }
    }
  }
  appendChildren(el, children);
  return el;
}

function appendChildren(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false || c === true) continue;
    el.appendChild(c.nodeType ? c : document.createTextNode(String(c)));
  }
}

/** Clear a node's children. */
export function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }

/** Replace contents of a node with new children. */
export function mount(el, ...children) { clear(el); appendChildren(el, children); return el; }

/** querySelector shorthand. */
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Simple raw-HTML fragment (trusted content only). */
export function raw(htmlStr) {
  const t = document.createElement('template');
  t.innerHTML = htmlStr.trim();
  return t.content.cloneNode(true);
}

/** Delay helper for async sequencing. */
export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
