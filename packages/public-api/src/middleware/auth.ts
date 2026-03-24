import type { NextFunction, Request, Response } from 'express'

import { env } from '../env'

const resolvePartnerCodeFromService = async (
  code: string,
): Promise<{ affiliateAddress: string; bps: string } | null> => {
  try {
    const response = await fetch(
      `${env.SWAP_SERVICE_BASE_URL}/v1/partner/${encodeURIComponent(code)}`,
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

export const resolvePartnerCode = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  const partnerCode = req.header('X-Partner-Code')

  if (partnerCode) {
    const resolved = await resolvePartnerCodeFromService(partnerCode)
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
    affiliateBps: env.DEFAULT_AFFILIATE_BPS,
  }

  next()
}
