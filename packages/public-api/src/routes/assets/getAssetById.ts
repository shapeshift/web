import type { Request, Response } from 'express'

import { getAsset } from '../../assets'
import { registry } from '../../registry'
import type { ErrorResponse } from '../../types'
import { rateLimitResponse } from '../../types'
import { AssetRequestSchema, AssetSchema } from './types'

registry.registerPath({
  method: 'get',
  path: '/v1/assets/{assetId}',
  operationId: 'getAssetById',
  summary: 'Get asset by ID',
  description: 'Get details of a specific asset by its ID (URL encoded).',
  tags: ['Supported Assets'],
  request: {
    params: AssetRequestSchema,
  },
  responses: {
    200: {
      description: 'Asset details',
      content: { 'application/json': { schema: AssetSchema } },
    },
    400: { description: 'Invalid asset ID' },
    404: { description: 'Asset not found' },
    429: rateLimitResponse,
    500: { description: 'Internal server error' },
  },
})

export const getAssetById = (req: Request, res: Response): void => {
  try {
    const parseResult = AssetRequestSchema.safeParse(req.params)
    if (!parseResult.success) {
      const errorResponse: ErrorResponse = {
        error: 'Invalid request parameters',
        details: parseResult.error.errors,
      }
      res.status(400).json(errorResponse)
      return
    }

    const { assetId } = parseResult.data
    // URL decode the assetId since it contains special characters
    let decodedAssetId: string
    try {
      decodedAssetId = decodeURIComponent(assetId)
    } catch {
      const errorResponse: ErrorResponse = {
        error: 'Invalid URL encoding for assetId',
        details: { assetId },
      }
      res.status(400).json(errorResponse)
      return
    }
    const asset = getAsset(decodedAssetId)

    if (!asset) {
      res.status(404).json({ error: `Asset not found: ${decodedAssetId}` } as ErrorResponse)
      return
    }

    res.json(asset)
  } catch (error) {
    console.error('Error in getAssetById:', error)
    res.status(500).json({ error: 'Internal server error' } as ErrorResponse)
  }
}
