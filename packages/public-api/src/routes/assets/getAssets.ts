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
    429: rateLimitResponse,
  },
})

export const getAssets = (req: Request, res: Response): void => {
  try {
    const parseResult = AssetsListRequestSchema.safeParse(req.query)
    if (!parseResult.success) {
      const errorResponse: ErrorResponse = {
        error: 'Invalid request parameters',
        details: parseResult.error.errors,
      }
      res.status(400).json(errorResponse)
      return
    }

    const { chainId, limit, offset } = parseResult.data

    let assets = getAllAssets()

    // Filter by chain if specified
    if (chainId) {
      assets = assets.filter(asset => asset.chainId === chainId)
    }

    // Apply pagination
    const paginatedAssets = assets.slice(offset, offset + limit)

    const response: AssetsListResponse = {
      assets: paginatedAssets,
      timestamp: Date.now(),
    }

    res.json(response)
  } catch (error) {
    console.error('Error in getAssets:', error)
    res.status(500).json({ error: 'Internal server error' } as ErrorResponse)
  }
}
