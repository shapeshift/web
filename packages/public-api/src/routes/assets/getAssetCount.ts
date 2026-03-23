import type { Request, Response } from 'express'

import { getAllAssets } from '../../assets'
import { registry } from '../../registry'
import type { ErrorResponse } from '../../types'
import { rateLimitResponse } from '../../types'
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
    400: { description: 'Invalid query parameters' },
    429: rateLimitResponse,
    500: { description: 'Internal server error' },
  },
})

export const getAssetCount = (req: Request, res: Response): void => {
  try {
    const parseResult = AssetCountRequestSchema.safeParse(req.query)
    if (!parseResult.success) {
      const errorResponse: ErrorResponse = {
        error: 'Invalid request parameters',
        details: parseResult.error.errors,
      }
      res.status(400).json(errorResponse)
      return
    }

    const { chainId } = parseResult.data
    const assets = getAllAssets()
    const count = chainId ? assets.filter(a => a.chainId === chainId).length : assets.length

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
