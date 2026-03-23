import type { Request, Response } from 'express'

import { SWAP_SERVICE_BASE_URL } from '../../config'
import { fetchSwapService } from '../../lib/fetchSwapService'
import { registry } from '../../registry'
import type { ErrorResponse } from '../../types'
import { rateLimitResponse } from '../../types'
import {
  AffiliateAddressParamsSchema,
  AffiliateConfigResponseSchema,
  UpdateAffiliateRequestSchema,
} from './types'

registry.registerPath({
  method: 'patch',
  path: '/v1/affiliate/{address}',
  operationId: 'updateAffiliate',
  summary: 'Update affiliate',
  description:
    'Update an existing affiliate configuration. Requires a valid SIWE JWT in the Authorization header.',
  tags: ['Affiliate'],
  request: {
    params: AffiliateAddressParamsSchema,
    body: {
      content: { 'application/json': { schema: UpdateAffiliateRequestSchema } },
    },
  },
  responses: {
    200: {
      description: 'Updated affiliate configuration',
      content: { 'application/json': { schema: AffiliateConfigResponseSchema } },
    },
    400: { description: 'Invalid request' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Affiliate not found' },
    429: rateLimitResponse,
    500: { description: 'Internal server error' },
    503: { description: 'Swap service unavailable' },
    504: { description: 'Swap service timed out' },
  },
})

export const updateAffiliate = async (req: Request, res: Response): Promise<void> => {
  try {
    const addressResult = AffiliateAddressParamsSchema.safeParse(req.params)
    if (!addressResult.success) {
      res.status(400).json({
        error: 'Invalid address format',
        code: 'INVALID_REQUEST',
        details: addressResult.error.errors,
      } as ErrorResponse)
      return
    }

    const bodyResult = UpdateAffiliateRequestSchema.safeParse(req.body)
    if (!bodyResult.success) {
      res.status(400).json({
        error: 'Invalid request body',
        code: 'INVALID_REQUEST',
        details: bodyResult.error.errors,
      } as ErrorResponse)
      return
    }

    const response = await fetchSwapService(
      res,
      `${SWAP_SERVICE_BASE_URL}/v1/affiliate/${addressResult.data.address}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}),
        },
        body: JSON.stringify(bodyResult.data),
      },
    )
    if (!response) return

    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: 'Upstream error' }))
      res.status(response.status).json(body)
      return
    }

    res.status(200).json(await response.json())
  } catch (error) {
    console.error('Unexpected error in updateAffiliate:', error)
    res
      .status(500)
      .json({ error: 'Internal server error', code: 'INTERNAL_ERROR' } as ErrorResponse)
  }
}
