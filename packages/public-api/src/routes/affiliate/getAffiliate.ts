import type { Request, Response } from 'express'

import { SWAP_SERVICE_BASE_URL } from '../../config'
import { fetchSwapService } from '../../lib/fetchSwapService'
import { registry } from '../../registry'
import type { ErrorResponse } from '../../types'
import { rateLimitResponse } from '../../types'
import { AffiliateAddressParamsSchema, AffiliateConfigResponseSchema } from './types'

registry.registerPath({
  method: 'get',
  path: '/v1/affiliate/{address}',
  operationId: 'getAffiliate',
  summary: 'Get affiliate config',
  description: 'Retrieve affiliate configuration for a given wallet address.',
  tags: ['Affiliate'],
  request: {
    params: AffiliateAddressParamsSchema,
  },
  responses: {
    200: {
      description: 'Affiliate configuration',
      content: { 'application/json': { schema: AffiliateConfigResponseSchema } },
    },
    400: { description: 'Invalid address format' },
    404: { description: 'Affiliate not found' },
    429: rateLimitResponse,
    500: { description: 'Internal server error' },
    503: { description: 'Swap service unavailable' },
    504: { description: 'Swap service timed out' },
  },
})

export const getAffiliate = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = AffiliateAddressParamsSchema.safeParse(req.params)
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Invalid address format',
        code: 'INVALID_REQUEST',
        details: parseResult.error.errors,
      } as ErrorResponse)
      return
    }

    const response = await fetchSwapService(
      res,
      `${SWAP_SERVICE_BASE_URL}/v1/affiliate/${parseResult.data.address}`,
    )

    if (!response) return

    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: 'Upstream error' }))
      res.status(response.status).json(body)
      return
    }

    res.status(200).json(await response.json())
  } catch (error) {
    console.error('Unexpected error in getAffiliate:', error)
    res
      .status(500)
      .json({ error: 'Internal server error', code: 'INTERNAL_ERROR' } as ErrorResponse)
  }
}
