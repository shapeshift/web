import type { Request, Response } from 'express'

import { registry } from '../../registry'
import type { ErrorResponse } from '../../types'
import { rateLimitResponse } from '../../types'
import type { ChainsListResponse } from './types'
import { ChainsListResponseSchema } from './types'
import { getChainList } from './utils'

registry.registerPath({
  method: 'get',
  path: '/v1/chains',
  operationId: 'listChains',
  summary: 'List supported chains',
  description: 'Get a list of all supported blockchain networks, sorted alphabetically by name.',
  tags: ['Supported Chains'],
  responses: {
    200: {
      description: 'List of chains',
      content: { 'application/json': { schema: ChainsListResponseSchema } },
    },
    429: rateLimitResponse,
  },
})

export const getChains = (_req: Request, res: Response): void => {
  try {
    const chains = getChainList()

    const response: ChainsListResponse = {
      chains,
      timestamp: Date.now(),
    }

    res.json(response)
  } catch (error) {
    console.error('Error in getChains:', error)
    res.status(500).json({ error: 'Internal server error' } as ErrorResponse)
  }
}
