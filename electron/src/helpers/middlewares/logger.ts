import { Request, Response, NextFunction } from 'express'
import { bridgeLogger } from '../../globalState'

export const logger = (req: Request, _res: Response, next: NextFunction) => {
    const serviceKey = req.headers.authorization
    if (!serviceKey) return next()
    const body = req.body
    bridgeLogger.log({ serviceKey, body, time: Date.now(), route: req.path, method: req.method })
    return next()
}

