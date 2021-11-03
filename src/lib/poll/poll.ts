type PollArgs<T> = {
  fn(): Promise<T>
  validate(result: unknown): boolean
  interval: number
  maxAttempts: number
}

/**
 *
 * @param fn async function that can be called that a consumer wants to monitor a result
 * @param validate validator to determine if the result of the `fn` has met a specific condition and polling can stop
 * @param interval frequency at which the `fn` is called
 * @param maxAttempts number of attempts before function rejects
 * @returns Promise<T>
 *
 * Ex: poll every second for up to 10 tries or until api request returns a valid response
 *
 * poll({
 *   fn: () => axios.get('/endpoint-with-changing-data'),
 *   validate: (result) => result.status === 'active',
 *   maxAttempts: 10,
 *   interval: 1000
 * })
 */
export function poll<T>({ fn, validate, interval, maxAttempts }: PollArgs<T>) {
  let attempts = 0
  const execute = async (resolve: (arg: T) => void, reject: (err: Error) => void) => {
    const result = await fn()
    attempts++
    if (validate(result)) {
      return resolve(result)
    } else if (maxAttempts && attempts === maxAttempts) {
      return reject(new Error('Exceeded max attempts'))
    } else {
      setTimeout(execute, interval, resolve, reject)
    }
  }
  return new Promise<T>(execute)
}
