/**
 * High-performance In-Memory LRU (Least Recently Used) Cache with TTL support.
 * Uses JavaScript Map key insertion ordering for O(1) get, set, and eviction.
 * Automatically evicts least recently accessed items when capacity is exceeded.
 */
export interface LRUCacheOptions {
  maxSize?: number;
  defaultTtlMs?: number;
}

interface CacheNode<V> {
  value: V;
  expiresAt: number;
}

export class LRUCache<K, V> {
  private readonly maxSize: number;
  private readonly defaultTtlMs: number;
  private readonly cache = new Map<K, CacheNode<V>>();

  constructor(options: LRUCacheOptions = {}) {
    this.maxSize = Math.max(1, options.maxSize ?? 100);
    this.defaultTtlMs = Math.max(100, options.defaultTtlMs ?? 30000);
  }

  /**
   * Retrieves an item from the cache. If expired, returns undefined and deletes the item.
   * If found and valid, refreshes its position to most recently used.
   */
  get(key: K): V | undefined {
    const node = this.cache.get(key);
    if (!node) return undefined;

    if (Date.now() > node.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    // Refresh LRU order: delete and re-insert at tail
    this.cache.delete(key);
    this.cache.set(key, node);
    return node.value;
  }

  /**
   * Inserts or updates an item in the cache.
   * If cache exceeds capacity, evicts the oldest (first) entry.
   */
  set(key: K, value: V, ttlMs?: number): void {
    const expiresAt = Date.now() + (ttlMs ?? this.defaultTtlMs);

    // If key already exists, delete to update position
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Evict least recently used (first key in Map)
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, { value, expiresAt });
  }

  /**
   * Check whether key exists and is not expired
   */
  has(key: K): boolean {
    const node = this.cache.get(key);
    if (!node) return false;
    if (Date.now() > node.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Delete an item by key
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all items in the cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Current number of items in cache
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Max capacity of the cache
   */
  get capacity(): number {
    return this.maxSize;
  }

  /**
   * Periodic pruning of all expired entries
   */
  pruneExpired(): number {
    const now = Date.now();
    let count = 0;
    for (const [key, node] of this.cache.entries()) {
      if (now > node.expiresAt) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }
}
