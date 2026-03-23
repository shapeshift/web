import type { Request, Response } from 'express'

import { SWAP_SERVICE_BASE_URL } from '../../config'
import { fetchSwapService } from '../../lib/fetchSwapService'
import { registry } from '../../registry'
import type { ErrorResponse } from '../../types'
import { rateLimitResponse } from '../../types'
import { AffiliateConfigResponseSchema, CreateAffiliateRequestSchema } from './types'

registry.registerPath({
  method: 'post',
  path: '/v1/affiliate',
  operationId: 'createAffiliate',
  summary: 'Create affiliate',
  description: 'Register a new affiliate. Requires a valid SIWE JWT in the Authorization header.',
  tags: ['Affiliate'],
  request: {
    body: {
      content: { 'application/json': { schema: CreateAffiliateRequestSchema } },
    },
  },
  responses: {
    201: {
      description: 'Affiliate created',
      content: { 'application/json': { schema: AffiliateConfigResponseSchema } },
    },
    400: { description: 'Invalid request body' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    409: { description: 'Affiliate already exists' },
    429: rateLimitResponse,
    500: { description: 'Internal server error' },
    503: { description: 'Swap service unavailable' },
    504: { description: 'Swap service timed out' },
  },
})

export const createAffiliate = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = CreateAffiliateRequestSchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Invalid request body',
        code: 'INVALID_REQUEST',
        details: parseResult.error.errors,
      } as ErrorResponse)
      return
    }

    const response = await fetchSwapService(res, `${SWAP_SERVICE_BASE_URL}/v1/affiliate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}),
      },
      body: JSON.stringify(parseResult.data),
    })

    if (!response) return

    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: 'Upstream error' }))
      res.status(response.status).json(body)
      return
    }

    res.status(201).json(await response.json())
  } catch (error) {
    console.error('Unexpected error in createAffiliate:', error)
    res
      .status(500)
      .json({ error: 'Internal server error', code: 'INTERNAL_ERROR' } as ErrorResponse)
  }
}
