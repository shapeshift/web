import { YIELD_MAX_POLL_ATTEMPTS, YIELD_POLL_INTERVAL_MS } from '@/lib/yieldxyz/constants'

export class PollTimeoutError extends Error {
  constructor(attempts: number) {
    super(`Condition not met after ${attempts} attempts`)
    this.name = 'PollTimeoutError'
  }
}

export class PollAbortedError extends Error {
  constructor() {
    super('Polling aborted')
    this.name = 'PollAbortedError'
  }
}

export async function pollUntil(
  predicate: () => Promise<boolean>,
  intervalMs: number = YIELD_POLL_INTERVAL_MS,
  maxAttempts: number = YIELD_MAX_POLL_ATTEMPTS,
  signal?: AbortSignal,
): Promise<void> {
  let attempts = 0

  while (attempts < maxAttempts) {
    if (signal?.aborted) throw new PollAbortedError()

    const met = await predicate()
    if (met) return

    attempts++

    if (attempts >= maxAttempts) break

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(resolve, intervalMs)
      signal?.addEventListener('abort', () => {
        clearTimeout(timeout)
        reject(new PollAbortedError())
      })
    })
  }

  throw new PollTimeoutError(attempts)
}
