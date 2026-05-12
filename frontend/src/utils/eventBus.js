/**
 * Tiny app-wide event bus (no external deps).
 * Use to coordinate safe cross-screen updates (e.g., after delete).
 */
const listeners = new Map();

export function on(eventName, callback) {
  if (!eventName || typeof callback !== 'function') return () => {};
  const list = listeners.get(eventName) || new Set();
  list.add(callback);
  listeners.set(eventName, list);
  return () => off(eventName, callback);
}

export function off(eventName, callback) {
  const list = listeners.get(eventName);
  if (!list) return;
  list.delete(callback);
  if (list.size === 0) listeners.delete(eventName);
}

export function emit(eventName, payload) {
  const list = listeners.get(eventName);
  if (!list) return;
  for (const cb of list) {
    try {
      cb(payload);
    } catch (e) {
      // keep bus resilient
      console.log('[eventBus] listener error', e?.message || e);
    }
  }
}

