import type { Request, Response } from 'express'

import { SWAP_SERVICE_BASE_URL } from '../../config'
import { fetchSwapService } from '../../lib/fetchSwapService'
import { registry } from '../../registry'
import type { ErrorResponse } from '../../types'
import { rateLimitResponse } from '../../types'
import { AffiliateSwapsRequestSchema, AffiliateSwapsResponseSchema } from './types'

registry.registerPath({
  method: 'get',
  path: '/v1/affiliate/swaps',
  operationId: 'getAffiliateSwaps',
  summary: 'Get affiliate swaps',
  description:
    'Retrieve paginated swap history for an affiliate address. Supports optional date range filtering.',
  tags: ['Affiliate'],
  request: {
    query: AffiliateSwapsRequestSchema,
  },
  responses: {
    200: {
      description: 'Affiliate swaps',
      content: { 'application/json': { schema: AffiliateSwapsResponseSchema } },
    },
    400: { description: 'Invalid query parameters' },
    429: rateLimitResponse,
    500: { description: 'Internal server error' },
    503: { description: 'Swap service unavailable' },
    504: { description: 'Swap service timed out' },
  },
})

export const getAffiliateSwaps = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = AffiliateSwapsRequestSchema.safeParse(req.query)
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Invalid request parameters',
        code: 'INVALID_REQUEST',
        details: parseResult.error.errors,
      } as ErrorResponse)
      return
    }

    const { address, startDate, endDate, limit, offset } = parseResult.data

    const url = new URL('/v1/affiliate/swaps', SWAP_SERVICE_BASE_URL)

    url.searchParams.append('address', address)
    url.searchParams.append('limit', String(limit))
    url.searchParams.append('offset', String(offset))

    if (startDate) url.searchParams.append('startDate', startDate)
    if (endDate) url.searchParams.append('endDate', endDate)

    const response = await fetchSwapService(res, url.toString())
    if (!response) return

    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: 'Upstream error' }))
      res.status(response.status).json(body)
      return
    }

    res.status(200).json(await response.json())
  } catch (error) {
    console.error('Unexpected error in getAffiliateSwaps:', error)
    res
      .status(500)
      .json({ error: 'Internal server error', code: 'INTERNAL_ERROR' } as ErrorResponse)
  }
}
