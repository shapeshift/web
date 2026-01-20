import crypto from 'crypto'
import type { NextFunction, Request, Response } from 'express'

import { STATIC_API_KEYS } from '../config'
import type { ErrorResponse, PartnerConfig } from '../types'

// Hash an API key for comparison (in production, keys would be stored hashed)
const hashApiKey = (key: string): string => {
  return crypto.createHash('sha256').update(key).digest('hex')
}

// API key authentication middleware
export const apiKeyAuth = (req: Request, res: Response, next: NextFunction): void => {
  const apiKey = req.header('X-API-Key')

  if (!apiKey) {
    const errorResponse: ErrorResponse = {
      error: 'API key required',
      code: 'MISSING_API_KEY',
    }
    res.status(401).json(errorResponse)
    return
  }

  // Look up the partner by API key
  // In production, this would query a database
  const partnerInfo = STATIC_API_KEYS[apiKey]

  if (!partnerInfo) {
    const errorResponse: ErrorResponse = {
      error: 'Invalid API key',
      code: 'INVALID_API_KEY',
    }
    res.status(401).json(errorResponse)
    return
  }

  // Attach partner info to request
  const partner: PartnerConfig = {
    id: hashApiKey(apiKey).substring(0, 16), // Use hash prefix as ID
    apiKeyHash: hashApiKey(apiKey),
    name: partnerInfo.name,
    feeSharePercentage: partnerInfo.feeSharePercentage,
    status: 'active',
    rateLimit: {
      requestsPerMinute: 60,
      requestsPerDay: 10000,
    },
    createdAt: new Date(),
  }

  req.partner = partner

  next()
}

// Optional auth - allows unauthenticated requests but attaches partner info if present
export const optionalApiKeyAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const apiKey = req.header('X-API-Key')

  if (apiKey) {
    const partnerInfo = STATIC_API_KEYS[apiKey]

    if (partnerInfo) {
      const partner: PartnerConfig = {
        id: hashApiKey(apiKey).substring(0, 16),
        apiKeyHash: hashApiKey(apiKey),
        name: partnerInfo.name,
        feeSharePercentage: partnerInfo.feeSharePercentage,
        status: 'active',
        rateLimit: {
          requestsPerMinute: 60,
          requestsPerDay: 10000,
        },
        createdAt: new Date(),
      }

      req.partner = partner
    }
  }

  next()
}
