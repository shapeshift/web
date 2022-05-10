export function raceWithAbort<T>(x: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return x
  const aborted = new Promise<never>((_resolve, reject) => {
    signal.addEventListener('abort', ev => reject(ev), { once: true })
  })
  return Promise.race([x, aborted])
}
