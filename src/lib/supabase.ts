/**
 * Supabase Client Configuration
 *
 * Using the main domain (bensupabase.nababancloud.com) which has proper SSL
 * configured by Coolify, instead of the Kong subdomain.
 */

import { createClient, type LockFunc } from '@supabase/supabase-js'

// Supabase URL and anon key from environment
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY'

const LOCK_ACQUIRE_TIMEOUT_MS = 5_000
const DEFAULT_FETCH_TIMEOUT_MS = 25_000
const STORAGE_FETCH_TIMEOUT_MS = 60_000

const processLocks = new Map<string, Promise<unknown>>()

async function processLockFallback<R>(
  name: string,
  acquireTimeout: number,
  fn: () => Promise<R>
): Promise<R> {
  const previous = processLocks.get(name) ?? Promise.resolve()

  let timedOut = false
  const waitPrevious = previous.catch(() => null)
  const raceItems: Promise<unknown>[] = [waitPrevious]

  let timer: ReturnType<typeof setTimeout> | undefined
  if (acquireTimeout >= 0) {
    raceItems.push(
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          timedOut = true
          const err = new Error(
            `Acquiring process lock "${name}" timed out`
          ) as Error & { isAcquireTimeout?: boolean }
          err.isAcquireTimeout = true
          reject(err)
        }, acquireTimeout)
      })
    )
  }

  const currentOperation = (async (): Promise<R> => {
    try {
      await Promise.race(raceItems)
    } finally {
      if (timer !== undefined) clearTimeout(timer)
    }
    if (timedOut) {
      const err = new Error(
        `Acquiring process lock "${name}" timed out`
      ) as Error & { isAcquireTimeout?: boolean }
      err.isAcquireTimeout = true
      throw err
    }
    return await fn()
  })()

  const queued = currentOperation.catch(() => null)
  processLocks.set(name, queued)
  queued.finally(() => {
    if (processLocks.get(name) === queued) {
      processLocks.delete(name)
    }
  })

  return await currentOperation
}

/**
 * Resilient auth lock wrapper around navigator.locks.
 * Prevents indefinite hangs when Android PWA / Chrome background tabs hold a stale Web Lock.
 */
const resilientAuthLock: LockFunc = async <R>(
  name: string,
  acquireTimeout: number,
  fn: () => Promise<R>
): Promise<R> => {
  if (typeof navigator === 'undefined' || !navigator.locks) {
    return await processLockFallback(name, acquireTimeout, fn)
  }

  if (acquireTimeout === 0) {
    try {
      return await navigator.locks.request(
        name,
        { mode: 'exclusive', ifAvailable: true },
        async (lock) => {
          if (!lock) {
            const err = new Error(
              `Acquiring an exclusive Navigator LockManager lock "${name}" immediately failed`
            ) as Error & { isAcquireTimeout?: boolean }
            err.isAcquireTimeout = true
            throw err
          }
          return await fn()
        }
      )
    } catch (err) {
      if (
        err instanceof DOMException &&
        (err.name === 'SecurityError' || err.name === 'NotSupportedError')
      ) {
        return await processLockFallback(name, acquireTimeout, fn)
      }
      throw err
    }
  }

  const effectiveTimeout =
    acquireTimeout < 0
      ? LOCK_ACQUIRE_TIMEOUT_MS
      : Math.min(acquireTimeout, LOCK_ACQUIRE_TIMEOUT_MS)
  const controller = new AbortController()
  let timedOut = false
  let acquired = false
  let timer: ReturnType<typeof setTimeout> | undefined = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, effectiveTimeout)

  try {
    return await navigator.locks.request(
      name,
      { mode: 'exclusive', signal: controller.signal },
      async (lock) => {
        acquired = true
        if (timer !== undefined) {
          clearTimeout(timer)
          timer = undefined
        }
        if (!lock) {
          return await processLockFallback(name, effectiveTimeout, fn)
        }
        return await fn()
      }
    )
  } catch (err) {
    if (timer !== undefined) {
      clearTimeout(timer)
      timer = undefined
    }

    if (acquired) {
      throw err
    }

    const isLockAbort =
      timedOut ||
      (err instanceof DOMException && err.name === 'AbortError') ||
      (err instanceof Error && err.name === 'AbortError')

    if (!isLockAbort) {
      if (
        err instanceof DOMException &&
        (err.name === 'SecurityError' || err.name === 'NotSupportedError')
      ) {
        return await processLockFallback(name, effectiveTimeout, fn)
      }
      throw err
    }

    console.warn(
      `[Supabase Auth] Lock "${name}" acquire timed out after ${effectiveTimeout}ms; stealing stale lock.`
    )

    let stealLockAcquired = false
    try {
      return await navigator.locks.request(name, { steal: true }, async () => {
        stealLockAcquired = true
        return await fn()
      })
    } catch (stealErr) {
      if (stealLockAcquired) {
        throw stealErr
      }
      console.warn(
        `[Supabase Auth] Steal lock "${name}" failed, falling back to in-process lock:`,
        stealErr
      )
      return await processLockFallback(name, -1, fn)
    }
  }
}

/**
 * Global fetch wrapper with bounded network timeouts to prevent silent mobile hangs.
 */
const fetchWithTimeout: typeof fetch = async (input, init) => {
  const url =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.href
        : input.url
  const timeoutMs = url.includes('/storage/v1/')
    ? STORAGE_FETCH_TIMEOUT_MS
    : DEFAULT_FETCH_TIMEOUT_MS

  const controller = new AbortController()
  const upstreamSignal = init?.signal

  if (upstreamSignal?.aborted) {
    controller.abort(upstreamSignal.reason)
  }

  const onUpstreamAbort = () => {
    controller.abort(upstreamSignal?.reason)
  }

  if (upstreamSignal && !upstreamSignal.aborted) {
    upstreamSignal.addEventListener('abort', onUpstreamAbort, { once: true })
  }

  const timer = setTimeout(() => {
    controller.abort(
      new DOMException(`Request timed out after ${timeoutMs}ms`, 'TimeoutError')
    )
  }, timeoutMs)

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timer)
    if (upstreamSignal) {
      upstreamSignal.removeEventListener('abort', onUpstreamAbort)
    }
  }
}

/**
 * Supabase client instance
 * Use this for all database operations
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Store auth session in localStorage (default for web)
    storage: window.localStorage,
    // Auto-refresh token
    autoRefreshToken: true,
    // Detect session in URL hash (for OAuth/magic link)
    detectSessionInUrl: true,
    // Persist session across page reloads
    persistSession: true,
    // Guard against stale Android Web Lock deadlocks
    lock: resilientAuthLock,
  },
  global: {
    fetch: fetchWithTimeout,
  },
})

/**
 * Database type helper for TypeScript autocompletion
 * Usage: supabase.from('profiles').select('*')
 */
export type Database = {
  public: {
    Tables: {
      locations: {
        Row: import('../types/database').Location
        Insert: Omit<import('../types/database').Location, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<import('../types/database').Location>
      }
      profiles: {
        Row: import('../types/database').Profile
        Insert: Omit<import('../types/database').Profile, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<import('../types/database').Profile>
      }
    }
  }
}
