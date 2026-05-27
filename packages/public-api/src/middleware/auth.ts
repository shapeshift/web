import type { NextFunction, Request, Response } from 'express'

import { env } from '../env'

const PARTNER_CODE_RESOLUTION_TIMEOUT_MS = 5_000

type PartnerCodeResponse = {
  partnerAddress: string
  partnerBps: number
  shapeshiftBps: number
}

const resolvePartnerCodeFromService = async (
  code: string,
): Promise<{ partnerAddress: string; partnerBps: string; shapeshiftBps: string } | null> => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), PARTNER_CODE_RESOLUTION_TIMEOUT_MS)

  try {
    const response = await fetch(
      `${env.SWAP_SERVICE_BASE_URL}/v1/partner/${encodeURIComponent(code)}`,
      { signal: controller.signal },
    )

    if (response.ok) {
      const data = (await response.json()) as PartnerCodeResponse
      return {
        partnerAddress: data.partnerAddress,
        partnerBps: String(data.partnerBps),
        shapeshiftBps: String(data.shapeshiftBps),
      }
    }

    return null
  } catch (error) {
    console.error('Failed to resolve partner code:', error)
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
        partnerAddress: resolved.partnerAddress,
        partnerBps: resolved.partnerBps,
        shapeshiftBps: resolved.shapeshiftBps,
        affiliateBps: String(Number(resolved.partnerBps) + Number(resolved.shapeshiftBps)),
        partnerCode,
      }
      next()
      return
    }
  }

  // No partner code provided — use default BPS for unattributed swaps
  req.affiliateInfo = {
    shapeshiftBps: env.DEFAULT_AFFILIATE_BPS,
    affiliateBps: env.DEFAULT_AFFILIATE_BPS,
  }

  next()
}
