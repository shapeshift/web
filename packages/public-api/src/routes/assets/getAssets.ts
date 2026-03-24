import type { Request, Response } from 'express'

import { getAllAssets } from '../../assets'
import { registry } from '../../registry'
import type { ErrorResponse } from '../../types'
import { rateLimitResponse } from '../../types'
import type { AssetsListResponse } from './types'
import { AssetsListRequestSchema, AssetsListResponseSchema } from './types'

registry.registerPath({
  method: 'get',
  path: '/v1/assets',
  operationId: 'listAssets',
  summary: 'List supported assets',
  description: 'Get a list of all supported assets, optionally filtered by chain.',
  tags: ['Supported Assets'],
  request: {
    query: AssetsListRequestSchema,
  },
  responses: {
    200: {
      description: 'List of assets',
      content: { 'application/json': { schema: AssetsListResponseSchema } },
    },
    400: { description: 'Invalid query parameters' },
    429: rateLimitResponse,
    500: { description: 'Internal server error' },
  },
})

export const getAssets = (req: Request, res: Response): void => {
  try {
    const queryResult = AssetsListRequestSchema.safeParse(req.query)
    if (!queryResult.success) {
      res.status(400).json({
        error: 'Invalid request parameters',
        details: queryResult.error.errors,
      } satisfies ErrorResponse)
      return
    }

    const { chainId, limit, offset } = queryResult.data

    const assets = getAllAssets()
    const filteredAssets = chainId ? assets.filter(asset => asset.chainId === chainId) : assets
    const paginatedAssets = filteredAssets.slice(offset, offset + limit)

    res.json({ assets: paginatedAssets, timestamp: Date.now() } satisfies AssetsListResponse)
  } catch (error) {
    console.error('Error in getAssets:', error)
    res.status(500).json({ error: 'Internal server error' } satisfies ErrorResponse)
  }
}
