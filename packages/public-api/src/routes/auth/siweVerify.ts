import type { Request, Response } from 'express'

import { SWAP_SERVICE_BASE_URL } from '../../config'
import { fetchSwapService } from '../../lib/fetchSwapService'
import { registry } from '../../registry'
import type { ErrorResponse } from '../../types'
import { rateLimitResponse } from '../../types'
import { SiweVerifyRequestSchema, SiweVerifyResponseSchema } from './types'

registry.registerPath({
  method: 'post',
  path: '/v1/auth/siwe/verify',
  operationId: 'siweVerify',
  summary: 'Verify SIWE signature',
  description:
    'Verify a Sign-In with Ethereum (SIWE) message and signature. Returns a JWT token on success.',
  tags: ['Auth'],
  request: {
    body: {
      content: { 'application/json': { schema: SiweVerifyRequestSchema } },
    },
  },
  responses: {
    200: {
      description: 'Authentication successful',
      content: { 'application/json': { schema: SiweVerifyResponseSchema } },
    },
    400: { description: 'Invalid request body' },
    401: { description: 'Invalid signature' },
    429: rateLimitResponse,
    500: { description: 'Internal server error' },
    503: { description: 'Swap service unavailable' },
    504: { description: 'Swap service timed out' },
  },
})

export const siweVerify = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = SiweVerifyRequestSchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Invalid request body',
        code: 'INVALID_REQUEST',
        details: parseResult.error.errors,
      } as ErrorResponse)
      return
    }

    const response = await fetchSwapService(res, `${SWAP_SERVICE_BASE_URL}/v1/auth/siwe/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parseResult.data),
    })

    if (!response) return

    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: 'Upstream error' }))
      res.status(response.status).json(body)
      return
    }

    res.status(200).json(await response.json())
  } catch (error) {
    console.error('Unexpected error in siweVerify:', error)
    res
      .status(500)
      .json({ error: 'Internal server error', code: 'INTERNAL_ERROR' } as ErrorResponse)
  }
}
