/**
 * Creates a shallow clone to allow mutation of a readonly object
 */
export const cloneAsMutable = <T>(obj: Readonly<T>): T => {
  return { ...obj }
}
