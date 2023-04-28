export const createThrottleMiddleware = ({
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
  const throttle = () => {
    let currentLevel = 0

    setInterval(() => {
      currentLevel = Math.max(0, currentLevel - drainPerInterval)
    }, intervalMs)

    return async () => {
      let isFull = currentLevel + costPerReq >= capacity
      while (isFull) {
        await new Promise(resolve => setTimeout(resolve, intervalMs))
        isFull = currentLevel + costPerReq >= capacity
      }
    }
  }

  return async (_req, _res, next) => {
    await throttle()
    next()
  }
}
