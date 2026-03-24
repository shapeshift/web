import type { Request, Response } from 'express'

import { env } from '../../env'
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
    400: { description: 'Invalid request parameters' },
    404: { description: 'Affiliate not found' },
    429: rateLimitResponse,
    500: { description: 'Internal server error' },
    503: { description: 'Swap service unavailable' },
    504: { description: 'Swap service timed out' },
  },
})

export const getAffiliate = async (req: Request, res: Response): Promise<void> => {
  try {
    const paramsResult = AffiliateAddressParamsSchema.safeParse(req.params)
    if (!paramsResult.success) {
      res.status(400).json({
        error: 'Invalid address format',
        code: 'INVALID_REQUEST',
        details: paramsResult.error.errors,
      } satisfies ErrorResponse)
      return
    }

    const response = await fetchSwapService(
      res,
      `${env.SWAP_SERVICE_BASE_URL}/v1/affiliate/${paramsResult.data.address}`,
    )

    if (!response) return

    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: 'Upstream error' }))
      res.status(response.status).json(body)
      return
    }

    const responseResult = AffiliateConfigResponseSchema.safeParse(await response.json())
    if (!responseResult.success) {
      console.error(
        'Unexpected response shape from swap-service /v1/affiliate/:address:',
        responseResult.error.errors,
      )
      res.status(503).json({
        error: 'Invalid response from swap service',
        code: 'INVALID_RESPONSE',
      } satisfies ErrorResponse)
      return
    }

    res.status(200).json(responseResult.data)
  } catch (error) {
    console.error('Unexpected error in getAffiliate:', error)
    res
      .status(500)
      .json({ error: 'Internal server error', code: 'INTERNAL_ERROR' } satisfies ErrorResponse)
  }
}
