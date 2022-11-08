import { Request, Response, NextFunction } from 'express'
import { bridgeLogger } from '../../main'

export const logger = (req: Request, res: Response, next: NextFunction) => {
    const serviceKey = req.headers.authorization
    if (!serviceKey) return next()
    const body = req.body
    bridgeLogger.log({ serviceKey, body, time: Date.now() })
    return next()
}

