import type { Request, Response } from 'express'

import { getAssetIds } from '../../assets'
import { registry } from '../../registry'
import type { ErrorResponse } from '../../types'
import type { AssetCountResponse } from './types'
import { AssetCountRequestSchema, AssetCountResponseSchema } from './types'

registry.registerPath({
  method: 'get',
  path: '/v1/assets/count',
  operationId: 'getAssetCount',
  summary: 'Get asset count',
  description: 'Get the total number of supported assets, optionally filtered by chain.',
  tags: ['Supported Assets'],
  request: {
    query: AssetCountRequestSchema,
  },
  responses: {
    200: {
      description: 'Asset count',
      content: { 'application/json': { schema: AssetCountResponseSchema } },
    },
  },
})

export const getAssetCount = (_req: Request, res: Response): void => {
  try {
    const count = getAssetIds().length

    const response: AssetCountResponse = {
      count,
      timestamp: Date.now(),
    }

    res.json(response)
  } catch (error) {
    console.error('Error in getAssetCount:', error)
    res.status(500).json({ error: 'Internal server error' } as ErrorResponse)
  }
}
