import type { Request, Response } from 'express'

import { env } from '../../env'
import { fetchSwapService } from '../../lib/fetchSwapService'
import { registry } from '../../registry'
import type { ErrorResponse } from '../../types'
import { rateLimitResponse } from '../../types'
import { SiweNonceResponseSchema } from './types'

registry.registerPath({
  method: 'post',
  path: '/v1/auth/siwe/nonce',
  operationId: 'siweNonce',
  summary: 'Get SIWE nonce',
  description: 'Request a nonce for Sign-In with Ethereum (SIWE) authentication.',
  tags: ['Auth'],
  responses: {
    200: {
      description: 'SIWE nonce',
      content: { 'application/json': { schema: SiweNonceResponseSchema } },
    },
    429: rateLimitResponse,
    500: { description: 'Internal server error' },
    503: { description: 'Swap service unavailable' },
    504: { description: 'Swap service timed out' },
  },
})

export const siweNonce = async (_req: Request, res: Response): Promise<void> => {
  try {
    const response = await fetchSwapService(
      res,
      `${env.SWAP_SERVICE_BASE_URL}/v1/auth/siwe/nonce`,
      { method: 'POST' },
    )

    if (!response) return

    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: 'Upstream error' }))
      res.status(response.status).json(body)
      return
    }

    const responseResult = SiweNonceResponseSchema.safeParse(await response.json())
    if (!responseResult.success) {
      console.error(
        'Unexpected response shape from swap-service /siwe/nonce:',
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
    console.error('Unexpected error in siweNonce:', error)
    res
      .status(500)
      .json({ error: 'Internal server error', code: 'INTERNAL_ERROR' } satisfies ErrorResponse)
  }
}
