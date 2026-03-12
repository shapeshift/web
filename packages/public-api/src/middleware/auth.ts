import type { NextFunction, Request, Response } from 'express'

import type { ErrorResponse } from '../types'

const EVM_ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/
const BPS_REGEX = /^\d+$/
const DEFAULT_AFFILIATE_BPS = '60'

// Microservices URL for affiliate BPS lookup
const MICROSERVICES_URL = process.env.MICROSERVICES_URL || 'http://localhost:3001'

/**
 * Lookup affiliate BPS from microservices
 * Returns configured BPS or default if not registered
 */
const lookupAffiliateBps = async (address: string): Promise<string> => {
  try {
    const response = await fetch(
      `${MICROSERVICES_URL}/v1/affiliate/lookup/bps?address=${encodeURIComponent(address)}`,
    )

    if (response.ok) {
      const data = (await response.json()) as { bps: number }
      return String(data.bps)
    }

    // Not found or error - use default
    return DEFAULT_AFFILIATE_BPS
  } catch {
    // Network error - use default
    return DEFAULT_AFFILIATE_BPS
  }
}

/**
 * Resolve partner code to affiliate address and BPS
 */
const resolvePartnerCode = async (
  code: string,
): Promise<{ affiliateAddress: string; bps: string } | null> => {
  try {
    const response = await fetch(
      `${MICROSERVICES_URL}/v1/partner/${encodeURIComponent(code)}`,
    )

    if (response.ok) {
      const data = (await response.json()) as {
        affiliateAddress: string
        bps: number
      }
      return {
        affiliateAddress: data.affiliateAddress,
        bps: String(data.bps),
      }
    }

    return null
  } catch {
    return null
  }
}

export const affiliateAddress = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const address = req.header('X-Affiliate-Address')
  const partnerCode = req.header('X-Partner-Code')
  let bps = req.header('X-Affiliate-Bps')

  // Validate address format if provided
  if (address && !EVM_ADDRESS_REGEX.test(address)) {
    const errorResponse: ErrorResponse = {
      error:
        'Invalid affiliate address format. Must be a valid EVM address (0x followed by 40 hex characters).',
      code: 'INVALID_AFFILIATE_ADDRESS',
    }
    res.status(400).json(errorResponse)
    return
  }

  // Validate BPS if explicitly provided
  if (bps !== undefined && (!BPS_REGEX.test(bps) || parseInt(bps, 10) > 1000)) {
    const errorResponse: ErrorResponse = {
      error: 'Invalid affiliate BPS. Must be an integer between 0 and 1000.',
      code: 'INVALID_AFFILIATE_BPS',
    }
    res.status(400).json(errorResponse)
    return
  }

  // Handle partner code - resolves to affiliate address and BPS
  if (partnerCode && !address) {
    const resolved = await resolvePartnerCode(partnerCode)
    if (resolved) {
      req.affiliateInfo = {
        affiliateAddress: resolved.affiliateAddress,
        affiliateBps: resolved.bps,
        partnerCode,
      }
      next()
      return
    }
    // Partner code not found - continue without affiliate info
  }

  // If address provided but no BPS, lookup from microservices
  if (address && !bps) {
    bps = await lookupAffiliateBps(address)
  }

  if (address || bps) {
    req.affiliateInfo = {
      ...(address && { affiliateAddress: address }),
      ...(bps && { affiliateBps: bps }),
    }
  }

  next()
}
