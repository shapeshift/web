import type { Request, Response } from 'express'

import { env } from '../../env'
import { fetchSwapService } from '../../lib/fetchSwapService'
import { registry } from '../../registry'
import type { ErrorResponse } from '../../types'
import { rateLimitResponse } from '../../types'
import type { AffiliateStatsResponse } from './types'
import { AffiliateStatsRequestSchema, AffiliateStatsResponseSchema } from './types'

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
    400: { description: 'Invalid request parameters' },
    429: rateLimitResponse,
    500: { description: 'Internal server error' },
    503: { description: 'Swap service unavailable' },
    504: { description: 'Swap service timed out' },
  },
})

export const getAffiliateStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const queryResult = AffiliateStatsRequestSchema.safeParse(req.query)
    if (!queryResult.success) {
      res.status(400).json({
        error: 'Invalid request parameters',
        code: 'INVALID_REQUEST',
        details: queryResult.error.errors,
      } satisfies ErrorResponse)
      return
    }

    const { address, startDate, endDate } = queryResult.data

    const url = new URL(`${env.SWAP_SERVICE_BASE_URL}/v1/affiliate/stats`)
    url.searchParams.append('address', address)

    if (startDate) url.searchParams.append('startDate', String(startDate))
    if (endDate) url.searchParams.append('endDate', String(endDate))

    const response = await fetchSwapService(res, url.toString())
    if (!response) return

    if (!response.ok) {
      if (response.status === 404) {
        res.status(200).json({
          totalSwaps: 0,
          totalVolumeUsd: '0.00',
          totalFeesEarnedUsd: '0.00',
        } satisfies AffiliateStatsResponse)
        return
      }

      const body = await response.json().catch(() => ({ error: 'Upstream error' }))
      res.status(response.status).json(body)
      return
    }

    const responseResult = AffiliateStatsResponseSchema.safeParse(
      await response.json().catch(() => null),
    )

    if (!responseResult.success) {
      console.error(
        'Unexpected response shape from swap-service /v1/affiliate/stats:',
        responseResult.error.errors,
      )
      res.status(503).json({
        error: 'Invalid response from swap service',
        code: 'INVALID_RESPONSE',
      } satisfies ErrorResponse)
      return
    }

    res.status(200).json(responseResult.data satisfies AffiliateStatsResponse)
  } catch (error) {
    console.error('Unexpected error in getAffiliateStats:', error)
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    } satisfies ErrorResponse)
  }
}
