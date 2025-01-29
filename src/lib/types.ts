export type PartialFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
export type MaybeUndefinedFields<T> = {
  [K in keyof T]: T[K] | undefined
}
