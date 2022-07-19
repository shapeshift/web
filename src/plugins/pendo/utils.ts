export function deferred<T>(): [
  Promise<T>,
  (x: T | PromiseLike<T>) => void,
  (e?: unknown) => void,
] {
  let resolver: (x: T | PromiseLike<T>) => void
  let rejector: (e?: unknown) => void
  const promise = new Promise<T>((resolve, reject) => {
    resolver = resolve
    rejector = reject
  })
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return [promise, resolver!, rejector!]
}
