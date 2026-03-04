import type { NextFunction, Request, Response } from 'express'

import type { ErrorResponse } from '../types'

const EVM_ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/

// Affiliate address middleware - attaches affiliate info if a valid address is provided
// The API works without an affiliate address (anonymous access)
export const affiliateAddress = (req: Request, res: Response, next: NextFunction): void => {
  const address = req.header('X-Affiliate-Address')

  if (!address) {
    next()
    return
  }

  if (!EVM_ADDRESS_REGEX.test(address)) {
    const errorResponse: ErrorResponse = {
      error:
        'Invalid affiliate address format. Must be a valid EVM address (0x followed by 40 hex characters).',
      code: 'INVALID_AFFILIATE_ADDRESS',
    }
    res.status(400).json(errorResponse)
    return
  }

  req.affiliateInfo = { affiliateAddress: address }

  next()
}
