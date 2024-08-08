export const createThrottle = ({
  capacity,
  costPerReq,
  drainPerInterval,
  intervalMs,
}: {
  capacity: number
  costPerReq: number
  drainPerInterval: number
  intervalMs: number
}) => {
  let currentLevel = 0
  let pendingResolves: ((value?: unknown) => void)[] = []

  const drain = () => {
    const drainAmount = Math.min(currentLevel, drainPerInterval)
    currentLevel -= drainAmount

    // Resolve pending promises if there's enough capacity
    while (pendingResolves.length > 0 && currentLevel + costPerReq <= capacity) {
      const resolve = pendingResolves.shift()
      if (resolve) {
        currentLevel += costPerReq
        resolve()
      }
    }
  }

  // Start the interval to drain the capacity
  const intervalId = setInterval(drain, intervalMs)

  const throttle = async () => {
    if (currentLevel + costPerReq <= capacity) {
      // If adding another request doesn't exceed capacity, proceed immediately
      currentLevel += costPerReq
    } else {
      // Otherwise, wait until there's enough capacity
      await new Promise(resolve => {
        pendingResolves.push(resolve)
      })
    }
  }

  const clear = () => clearInterval(intervalId)

  return { throttle, clear }
}
