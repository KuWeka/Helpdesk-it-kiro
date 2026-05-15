/**
 * In-memory cache for user active status to reduce DB queries in authenticate middleware.
 * TTL of 60 seconds per entry. Cache is invalidated explicitly on soft-delete.
 */

interface CacheEntry {
  isActive: boolean;
  cachedAt: number;
}

const cache = new Map<string, CacheEntry>();
const TTL_MS = 60 * 1000; // 60 seconds

/**
 * Get cached user active status. Returns null on cache miss or expired entry.
 */
export function getCachedUserStatus(userId: string): boolean | null {
  const entry = cache.get(userId);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > TTL_MS) {
    cache.delete(userId);
    return null;
  }
  return entry.isActive;
}

/**
 * Store user active status in cache.
 */
export function setCachedUserStatus(userId: string, isActive: boolean): void {
  cache.set(userId, { isActive, cachedAt: Date.now() });
}

/**
 * Remove a user entry from cache. Call this after soft-deleting a user.
 */
export function invalidateCachedUser(userId: string): void {
  cache.delete(userId);
}
