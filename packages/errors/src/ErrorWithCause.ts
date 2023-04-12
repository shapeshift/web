export class ErrorWithCause<T extends { cause?: unknown } | undefined = undefined> extends Error {
  readonly cause: T extends { cause: infer R } ? R : undefined

  constructor(message?: string, options?: T) {
    super(message)
    this.name = this.constructor.name
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.cause = options?.cause as any
  }
}
