import type { NextFunction, Request, Response } from 'express'
import { z } from 'zod'

import { env } from '../env'
import { EVM_ADDRESS } from '../types'

const PARTNER_CODE_RESOLUTION_TIMEOUT_MS = 5_000

const PartnerCodeResponseSchema = z.object({
  partnerAddress: EVM_ADDRESS,
  partnerBps: z.number().int().min(0),
  shapeshiftBps: z.number().int().min(0),
})

const resolvePartnerCodeFromService = async (
  code: string,
): Promise<{ partnerAddress: string; partnerBps: string; shapeshiftBps: string } | null> => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), PARTNER_CODE_RESOLUTION_TIMEOUT_MS)

  try {
    const response = await fetch(
      `${env.SWAP_SERVICE_BASE_URL}/v1/partner/${encodeURIComponent(code)}`,
      { headers: { 'x-api-key': env.SWAP_SERVICE_API_KEY }, signal: controller.signal },
    )

    if (!response.ok) return null

    const parsed = PartnerCodeResponseSchema.safeParse(await response.json())
    if (!parsed.success) {
      console.error('Malformed /v1/partner response:', parsed.error.errors)
      return null
    }

    return {
      partnerAddress: parsed.data.partnerAddress,
      partnerBps: String(parsed.data.partnerBps),
      shapeshiftBps: String(parsed.data.shapeshiftBps),
    }
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
