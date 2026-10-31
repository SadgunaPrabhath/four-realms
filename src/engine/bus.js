/* ============================================================
   Minimal event bus for cross-system communication
   (achievements, audio cues, UI refresh, toasts).
   ============================================================ */
class EventBus {
  constructor() { this.map = new Map(); }
  on(evt, fn) {
    if (!this.map.has(evt)) this.map.set(evt, new Set());
    this.map.get(evt).add(fn);
    return () => this.off(evt, fn);
  }
  once(evt, fn) {
    const off = this.on(evt, (...a) => { off(); fn(...a); });
    return off;
  }
  off(evt, fn) { this.map.get(evt)?.delete(fn); }
  emit(evt, payload) {
    this.map.get(evt)?.forEach((fn) => {
      try { fn(payload); } catch (e) { console.error(`[bus:${evt}]`, e); }
    });
    // wildcard listeners
    this.map.get('*')?.forEach((fn) => { try { fn(evt, payload); } catch {} });
  }
}
export const bus = new EventBus();
