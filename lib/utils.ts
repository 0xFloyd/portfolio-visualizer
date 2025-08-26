// Shared network utility helpers: sleep, createRateLimiter, retry with backoff, and bounded parallel map.

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export type RateLimiter = {
  schedule<T>(task: () => Promise<T>): Promise<T>
}

export function createRateLimiter(maxConcurrent: number, minSpacingMs: number): RateLimiter {
  let inFlight = 0
  let nextAvailableAt = 0
  const queue: Array<() => void> = []
  let scheduled = false

  function drain() {
    if (scheduled) return
    scheduled = true
    const tryStart = () => {
      scheduled = false
      while (inFlight < maxConcurrent && queue.length > 0) {
        const fn = queue.shift()!
        fn()
      }
      if (queue.length > 0 && inFlight < maxConcurrent) {
        const delay = Math.max(0, nextAvailableAt - Date.now())
        scheduled = true
        setTimeout(tryStart, Math.min(delay, 25))
      }
    }
    setTimeout(tryStart, 0)
  }

  async function schedule<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const run = async () => {
        try {
          const waitMs = Math.max(0, nextAvailableAt - Date.now())
          if (waitMs > 0) await sleep(waitMs)
          inFlight++
          nextAvailableAt = Date.now() + minSpacingMs
          const result = await task()
          resolve(result)
        } catch (err) {
          reject(err)
        } finally {
          inFlight--
          drain()
        }
      }
      queue.push(run)
      drain()
    })
  }

  return { schedule }
}

export type RetryOptions = {
  attempts?: number
  baseDelayMs?: number
  maxDelayMs?: number
  jitterRatio?: number // 0..1 portion of delay to add as random jitter
  isRetryable?: (error: any, attempt: number) => boolean
}

export async function retryWithBackoff<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const attempts = opts.attempts ?? 4
  const base = opts.baseDelayMs ?? 200
  const max = opts.maxDelayMs ?? 5000
  const jitterRatio = opts.jitterRatio ?? 0.3
  const isRetryable = opts.isRetryable ?? (() => true)

  let attempt = 0
  let lastErr: any
  while (attempt <= attempts) {
    try {
      return await fn()
    } catch (e) {
      lastErr = e
      if (!isRetryable(e, attempt) || attempt === attempts) break
      const delay = Math.min(base * Math.pow(2, attempt), max)
      const jitter = Math.floor(Math.random() * jitterRatio * delay)
      await sleep(delay + jitter)
      attempt++
    }
  }
  throw lastErr
}

export async function parallelMapWithLimit<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  if (limit <= 1) {
    const out: R[] = []
    for (let i = 0; i < items.length; i++) out.push(await worker(items[i], i))
    return out
  }
  const results: R[] = new Array(items.length)
  let nextIndex = 0
  const runners: Promise<void>[] = []
  const runNext = async () => {
    const i = nextIndex++
    if (i >= items.length) return
    results[i] = await worker(items[i], i)
    await runNext()
  }
  for (let c = 0; c < Math.min(limit, items.length); c++) runners.push(runNext())
  await Promise.all(runners)
  return results
}
