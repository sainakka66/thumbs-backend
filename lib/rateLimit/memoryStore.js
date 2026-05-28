/**
 * In-memory sliding-window counter store (production: set REDIS_URL for future adapter).
 */
class MemorySlidingWindowStore {
  constructor() {
    this.buckets = new Map();
    this.cleanupInterval = setInterval(() => this.prune(), 60_000);
    if (this.cleanupInterval.unref) this.cleanupInterval.unref();
  }

  _key(key) {
    return String(key);
  }

  prune() {
    const now = Date.now();
    for (const [k, entries] of this.buckets.entries()) {
      const filtered = entries.filter((e) => e.expiresAt > now);
      if (!filtered.length) this.buckets.delete(k);
      else this.buckets.set(k, filtered);
    }
  }

  increment(key, windowMs, weight = 1) {
    const k = this._key(key);
    const now = Date.now();
    const expiresAt = now + windowMs;
    const entries = (this.buckets.get(k) || []).filter((e) => e.expiresAt > now);
    entries.push({ expiresAt, weight });
    this.buckets.set(k, entries);
    return entries.reduce((sum, e) => sum + e.weight, 0);
  }

  getCount(key, windowMs) {
    const k = this._key(key);
    const now = Date.now();
    const entries = (this.buckets.get(k) || []).filter((e) => e.expiresAt > now && e.expiresAt <= now + windowMs);
    return entries.reduce((sum, e) => sum + e.weight, 0);
  }

  setCooldown(key, untilMs) {
    this.buckets.set(`cd:${this._key(key)}`, [{ expiresAt: untilMs, weight: 1 }]);
  }

  isCoolingDown(key) {
    const entries = this.buckets.get(`cd:${this._key(key)}`) || [];
    const now = Date.now();
    return entries.some((e) => e.expiresAt > now);
  }
}

let store = null;

function getRateLimitStore() {
  if (!store) store = new MemorySlidingWindowStore();
  return store;
}

module.exports = { MemorySlidingWindowStore, getRateLimitStore };
