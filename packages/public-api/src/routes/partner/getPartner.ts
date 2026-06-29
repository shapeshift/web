import type { Request, Response } from 'express'

import { env } from '../../env'
import { fetchSwapService } from '../../lib/fetchSwapService'
import { registry } from '../../registry'
import type { ErrorResponse } from '../../types'
import { rateLimitResponse } from '../../types'
import { PartnerCodeParamsSchema, PartnerResolutionResponseSchema } from './types'

registry.registerPath({
  method: 'get',
  path: '/v1/partner/{code}',
  operationId: 'resolvePartner',
  summary: 'Resolve a partner referral code',
  description:
    'Resolve a partner referral code to its attribution details (partner address and bps split).',
  tags: ['Affiliate'],
  request: {
    params: PartnerCodeParamsSchema,
  },
  responses: {
    200: {
      description: 'Partner attribution',
      content: { 'application/json': { schema: PartnerResolutionResponseSchema } },
    },
    400: { description: 'Invalid request parameters' },
    404: { description: 'Partner code not found' },
    429: rateLimitResponse,
    500: { description: 'Internal server error' },
    503: { description: 'Swap service unavailable' },
    504: { description: 'Swap service timed out' },
  },
})

export const getPartner = async (req: Request, res: Response): Promise<void> => {
  try {
    const paramsResult = PartnerCodeParamsSchema.safeParse(req.params)
    if (!paramsResult.success) {
      res.status(400).json({
        error: 'Invalid partner code',
        code: 'INVALID_REQUEST',
        details: paramsResult.error.errors,
      } satisfies ErrorResponse)
      return
    }

    const response = await fetchSwapService(
      res,
      `${env.SWAP_SERVICE_BASE_URL}/v1/partner/${encodeURIComponent(paramsResult.data.code)}`,
    )

    if (!response) return

    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: 'Upstream error' }))
      res.status(response.status).json(body)
      return
    }

    const responseResult = PartnerResolutionResponseSchema.safeParse(
      await response.json().catch(() => null),
    )

    if (!responseResult.success) {
      console.error(
        'Unexpected response shape from swap-service /v1/partner/:code:',
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
    console.error('Unexpected error in getPartner:', error)
    res
      .status(500)
      .json({ error: 'Internal server error', code: 'INTERNAL_ERROR' } satisfies ErrorResponse)
  }
}
