export type PollArgs<T> = {
  fn(): Promise<T>
  validate(result: Awaited<T>): boolean
  interval: number
  maxAttempts: number
}

const sleep = async (intervalMs: number) =>
  await new Promise(resolve => setTimeout(resolve, intervalMs))

/**
 * WARNING: Do not use this in components directly unless you want polling to continue after the component unmounts
 *
 * @param fn async function that can be called that a consumer wants to monitor a result
 * @param validate validator to determine if the result of the `fn` has met a specific condition and polling can stop
 * @param interval frequency at which the `fn` is called
 * @param maxAttempts number of attempts before function rejects
 * @returns object containing the promise to await and a callback to cancel polling
 *
 * Ex: poll every second for up to 10 tries or until api request returns a valid response
 *
 * ```
 * poll({
 *   fn: () => axios.get('/endpoint-with-changing-data'),
 *   validate: (result) => result.status === 'active',
 *   maxAttempts: 10,
 *   interval: 1000
 * })
 * ```
 */
export const poll = <T>({
  fn,
  validate,
  interval,
  maxAttempts,
}: PollArgs<T>): {
  promise: Promise<T>
  cancelPolling: () => void
} => {
  let isCancelled = false
  const execute = async (resolve: (arg: T) => void, reject: (err: unknown) => void) => {
    for (let attempts = 0; attempts < maxAttempts; attempts++) {
      if (isCancelled) return // dont resolve/reject - leave promise on event loop
      try {
        const result = await fn()
        if (validate(result)) {
          resolve(result)
          return
        }
        await sleep(interval)
      } catch (e) {
        reject(e)
        return
      }
    }

    reject(Error('Exceeded max attempts'))
  }

  const promise = new Promise(execute)

  const cancelPolling = () => {
    isCancelled = true
  }

  return { promise, cancelPolling }
}
