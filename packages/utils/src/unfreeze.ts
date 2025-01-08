/**
 * Creates a shallow clone to allow mutation of a readonly object
 */
export const unfreeze = <T>(obj: Readonly<T>): T => {
  return { ...obj }
}
