// server/services/scraperLockService.js

/**
 * In-memory distributed lock mechanism for scraper orchestration.
 * In a multi-node environment, this should be backed by Redis or MongoDB.
 */
const locks = new Map();

/**
 * Acquires a lock for a given resource.
 * @param {string} resourceName 
 * @param {number} timeoutMs Optional. How long until the lock auto-expires.
 * @returns {boolean} True if lock was acquired, false if it was already held.
 */
import { LOCK_TTL_MS } from "../config/orchestrationConfig.js";

export function acquireLock(resourceName, timeoutMs = LOCK_TTL_MS) {
  const now = Date.now();
  const existingLock = locks.get(resourceName);

  if (existingLock && existingLock > now) {
    // Lock exists and hasn't expired
    return false;
  }

  // Acquire or refresh expired lock
  locks.set(resourceName, now + timeoutMs);
  return true;
}

/**
 * Releases a lock for a given resource.
 * @param {string} resourceName 
 */
export function releaseLock(resourceName) {
  locks.delete(resourceName);
}

/**
 * Checks if a lock is currently held.
 * @param {string} resourceName 
 * @returns {boolean}
 */
export function isLocked(resourceName) {
  const now = Date.now();
  const existingLock = locks.get(resourceName);
  return !!(existingLock && existingLock > now);
}

/**
 * Actively cleans up expired locks to prevent memory leaks over time.
 */
export function cleanupLocks() {
  const now = Date.now();
  for (const [key, expiresAt] of locks.entries()) {
    if (expiresAt <= now) {
      locks.delete(key);
    }
  }
}
