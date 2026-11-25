// In-memory caches shared by server.js and the routes. productCache holds the product list
// ('all_products') and single products ('product_<id>'); clear it whenever stock changes.

// In-Memory Cache Helper (bounded: the oldest entry is evicted once maxEntries is reached)
export class MemoryCache {
  constructor(ttl = 5 * 60 * 1000, maxEntries = 500) { // Default TTL: 5 minutes
    this.cache = new Map();
    this.ttl = ttl;
    this.maxEntries = maxEntries;
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }

  set(key, value) {
    this.cache.delete(key); // re-insert so Map order reflects recency
    if (this.cache.size >= this.maxEntries) {
      this.cache.delete(this.cache.keys().next().value);
    }
    this.cache.set(key, {
      value,
      expiry: Date.now() + this.ttl
    });
  }

  delete(key) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }
}

export const productCache = new MemoryCache(5 * 60 * 1000);
export const farmerCache = new MemoryCache(5 * 60 * 1000);

// Drops the cached product list and the given products, after their stock changed
export function invalidateProducts(productIds = []) {
  productCache.delete('all_products');
  for (const id of productIds) productCache.delete(`product_${id}`);
}
