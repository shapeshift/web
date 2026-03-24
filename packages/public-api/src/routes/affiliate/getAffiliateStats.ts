import type { Request, Response } from 'express'

import { env } from '../../env'
import { registry } from '../../registry'
import type { ErrorResponse } from '../../types'
import type { AffiliateStatsResponse } from './types'
import { AffiliateStatsRequestSchema, AffiliateStatsResponseSchema } from './types'

const AFFILIATE_TIMEOUT_MS = 10_000

// Backend response type from swap-service
type BackendAffiliateStats = {
  affiliateAddress: string
  swapCount: number
  totalSwapVolumeUsd: string
  totalFeesCollectedUsd: string
  referrerCommissionUsd: string
}

registry.registerPath({
  method: 'get',
  path: '/v1/affiliate/stats',
  operationId: 'getAffiliateStats',
  summary: 'Get affiliate statistics',
  description:
    'Retrieve aggregated swap statistics for an affiliate address. Returns total swaps, volume, and fees earned. Supports optional date range filtering.',
  tags: ['Affiliate'],
  request: {
    query: AffiliateStatsRequestSchema,
  },
  responses: {
    200: {
      description: 'Affiliate statistics',
      content: { 'application/json': { schema: AffiliateStatsResponseSchema } },
    },
    400: {
      description: 'Invalid address format',
    },
    503: {
      description: 'Swap service unavailable',
    },
  },
})

export const getAffiliateStats = async (req: Request, res: Response): Promise<void> => {
  try {
    // Parse and validate request
    const parseResult = AffiliateStatsRequestSchema.safeParse(req.query)
    if (!parseResult.success) {
      const errorResponse: ErrorResponse = {
        error: 'Invalid request parameters',
        code: 'INVALID_REQUEST',
        details: parseResult.error.errors,
      }
      res.status(400).json(errorResponse)
      return
    }

    const { address, startDate, endDate } = parseResult.data

    // Build backend URL with query params
    const backendUrl = new URL(`${env.SWAP_SERVICE_BASE_URL}/swaps/affiliate-fees/${address}`)
    if (startDate) {
      backendUrl.searchParams.append('startDate', String(startDate))
    }
    if (endDate) {
      backendUrl.searchParams.append('endDate', String(endDate))
    }

    // Call backend swap-service
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), AFFILIATE_TIMEOUT_MS)
    let backendResponse: globalThis.Response
    try {
      backendResponse = await fetch(backendUrl.toString(), {
        signal: controller.signal,
      })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        res.status(504).json({
          error: 'Swap service request timed out',
          code: 'SERVICE_TIMEOUT',
        } as ErrorResponse)
        return
      }
      console.error('Failed to connect to swap-service:', error)
      res.status(503).json({
        error: 'Swap service unavailable',
        code: 'SERVICE_UNAVAILABLE',
      } as ErrorResponse)
      return
    } finally {
      clearTimeout(timeout)
    }

    // Handle backend errors
    if (!backendResponse.ok) {
      if (backendResponse.status === 404) {
        // Non-existent affiliate - return 200 with zero values
        const response: AffiliateStatsResponse = {
          address,
          totalSwaps: 0,
          totalVolumeUsd: '0.00',
          totalFeesEarnedUsd: '0.00',
          timestamp: Date.now(),
        }
        res.status(200).json(response)
        return
      }

      console.error(`Backend returned ${backendResponse.status}:`, await backendResponse.text())
      res.status(503).json({
        error: 'Swap service error',
        code: 'SERVICE_ERROR',
      } as ErrorResponse)
      return
    }

    // Parse backend response
    let backendData: BackendAffiliateStats
    try {
      backendData = (await backendResponse.json()) as BackendAffiliateStats
    } catch (error) {
      console.error('Failed to parse backend response:', error)
      res.status(503).json({
        error: 'Invalid response from swap service',
        code: 'INVALID_RESPONSE',
      } as ErrorResponse)
      return
    }

    // Transform backend response to public API format
    const response: AffiliateStatsResponse = {
      address: String(backendData.affiliateAddress),
      totalSwaps: backendData.swapCount,
      totalVolumeUsd: backendData.totalSwapVolumeUsd,
      totalFeesEarnedUsd: backendData.referrerCommissionUsd,
      timestamp: Date.now(),
    }

    res.status(200).json(response)
  } catch (error) {
    console.error('Unexpected error in getAffiliateStats:', error)
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    } as ErrorResponse)
  }
}
