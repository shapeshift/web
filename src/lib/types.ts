// allows use to mark a property of an object as non-nullable
export type RequireFields<T, K extends keyof T> = {
  [P in keyof T]: P extends K ? NonNullable<T[P]> : T[P]
}

export type PartialFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
export type MaybeUndefinedFields<T> = {
  [K in keyof T]: T[K] | undefined
}
