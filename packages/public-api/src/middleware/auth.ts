import type { NextFunction, Request, Response } from 'express'

const DEFAULT_AFFILIATE_BPS = '60'

// Microservices URL for partner code resolution
const MICROSERVICES_URL = process.env.MICROSERVICES_URL || 'http://localhost:3001'

/**
 * Resolve partner code to affiliate address and BPS
 */
const resolvePartnerCode = async (
  code: string,
): Promise<{ affiliateAddress: string; bps: string } | null> => {
  try {
    const response = await fetch(`${MICROSERVICES_URL}/v1/partner/${encodeURIComponent(code)}`)

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
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  const partnerCode = req.header('X-Partner-Code')

  if (partnerCode) {
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
    // Partner code not found — continue without affiliate info
  }

  // No partner code provided — use default BPS for unattributed swaps
  req.affiliateInfo = {
    affiliateBps: DEFAULT_AFFILIATE_BPS,
  }

  next()
}
