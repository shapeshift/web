import type { NextFunction } from 'express-serve-static-core'

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
  let currentLevel = 0

  setInterval(() => {
    currentLevel = Math.max(0, currentLevel - drainPerInterval)
  }, intervalMs)

  const throttle = async () => {
    let isFull = currentLevel + costPerReq >= capacity
    while (isFull) {
      await new Promise(resolve => setTimeout(resolve, intervalMs))
      isFull = currentLevel + costPerReq >= capacity
    }
  }

  return async (_req: unknown, _res: unknown, next: NextFunction) => {
    await throttle()
    next()
  }
}
