import type { NextFunction, Request, Response } from 'express'

import type { ErrorResponse } from '../types'

const EVM_ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/
const BPS_REGEX = /^\d+$/

export const affiliateAddress = (req: Request, res: Response, next: NextFunction): void => {
  const address = req.header('X-Affiliate-Address')
  const bps = req.header('X-Affiliate-Bps')

  if (address && !EVM_ADDRESS_REGEX.test(address)) {
    const errorResponse: ErrorResponse = {
      error:
        'Invalid affiliate address format. Must be a valid EVM address (0x followed by 40 hex characters).',
      code: 'INVALID_AFFILIATE_ADDRESS',
    }
    res.status(400).json(errorResponse)
    return
  }

  if (bps !== undefined && (!BPS_REGEX.test(bps) || parseInt(bps, 10) > 1000)) {
    const errorResponse: ErrorResponse = {
      error: 'Invalid affiliate BPS. Must be an integer between 0 and 1000.',
      code: 'INVALID_AFFILIATE_BPS',
    }
    res.status(400).json(errorResponse)
    return
  }

  if (address || bps) {
    req.affiliateInfo = {
      ...(address && { affiliateAddress: address }),
      ...(bps && { affiliateBps: bps }),
    }
  }

  next()
}
