import type { RequestHandler } from 'express'
import type { ParamsDictionary } from 'express-serve-static-core'
import type { ParsedQs } from 'qs'

export const createThrottleMiddleware = <
  P = ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  ReqQuery = ParsedQs,
  Locals extends Record<string, any> = Record<string, any>,
>({
  capacity,
  costPerReq,
  drainPerInterval,
  intervalMs,
}: {
  capacity: number
  costPerReq: number
  drainPerInterval: number
  intervalMs: number
}): RequestHandler<P, ResBody, ReqBody, ReqQuery, Locals> => {
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
