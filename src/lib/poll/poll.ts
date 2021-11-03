type PollArgs<T> = {
  fn(): Promise<T>
  validate(result: unknown): boolean
  interval: number
  maxAttempts: number
}

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
