import type { NextFunction, Request, Response } from 'express'

import { env } from '../env'

const PARTNER_CODE_RESOLUTION_TIMEOUT_MS = 5_000

const resolvePartnerCodeFromService = async (
  code: string,
): Promise<{ affiliateAddress: string; bps: string } | null> => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), PARTNER_CODE_RESOLUTION_TIMEOUT_MS)

  try {
    const response = await fetch(
      `${env.SWAP_SERVICE_BASE_URL}/v1/partner/${encodeURIComponent(code)}`,
      { signal: controller.signal },
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
  } finally {
    clearTimeout(timeout)
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
  }

  // No partner code provided — use default BPS for unattributed swaps
  req.affiliateInfo = {
    affiliateBps: env.DEFAULT_AFFILIATE_BPS,
  }

  next()
}
