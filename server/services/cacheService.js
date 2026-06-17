/**
 * A fast, in-memory TTL Cache layer.
 * Native Map used to avoid external dependencies like Redis.
 */
class CacheService {
  constructor() {
    this.cache = new Map();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get an item from the cache.
   * @param {string} key 
   */
  get(key) {
    if (!this.cache.has(key)) {
      this.misses++;
      return null;
    }

    const item = this.cache.get(key);
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return item.value;
  }

  /**
   * Set an item in the cache.
   * @param {string} key 
   * @param {any} value 
   * @param {number} ttlSeconds 
   */
  set(key, value, ttlSeconds = 300) {
    const expiry = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, { value, expiry });
  }

  /**
   * Invalidate a specific key.
   */
  invalidate(key) {
    this.cache.delete(key);
  }

  /**
   * Clear all cache.
   */
  clear() {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache metrics.
   */
  getStats() {
    return {
      keys: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: this.hits + this.misses > 0 ? (this.hits / (this.hits + this.misses)).toFixed(2) : 0
    };
  }
}

export const globalCache = new CacheService();
