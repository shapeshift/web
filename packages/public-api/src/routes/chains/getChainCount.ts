import type { Request, Response } from 'express'

import { registry } from '../../registry'
import type { ErrorResponse } from '../../types'
import { rateLimitResponse } from '../../types'
import type { ChainCountResponse } from './types'
import { ChainCountResponseSchema } from './types'
import { getChainList } from './utils'

registry.registerPath({
  method: 'get',
  path: '/v1/chains/count',
  operationId: 'getChainCount',
  summary: 'Get chain count',
  description: 'Get the total number of supported blockchain networks.',
  tags: ['Supported Chains'],
  responses: {
    200: {
      description: 'Chain count',
      content: { 'application/json': { schema: ChainCountResponseSchema } },
    },
    429: rateLimitResponse,
    500: { description: 'Internal server error' },
  },
})

export const getChainCount = (_req: Request, res: Response): void => {
  try {
    const count = getChainList().length

    const response: ChainCountResponse = {
      count,
      timestamp: Date.now(),
    }

    res.json(response)
  } catch (error) {
    console.error('Error in getChainCount:', error)
    res.status(500).json({ error: 'Internal server error' } as ErrorResponse)
  }
}
