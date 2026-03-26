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
    const paramsResult = AssetRequestSchema.safeParse(req.params)
    if (!paramsResult.success) {
      res.status(400).json({
        error: 'Invalid request parameters',
        details: paramsResult.error.errors,
      } satisfies ErrorResponse)
      return
    }

    const { assetId } = paramsResult.data

    const decodedAssetId = (() => {
      try {
        return decodeURIComponent(assetId)
      } catch {
        res.status(400).json({
          error: 'Invalid URL encoding for assetId',
          details: { assetId },
        } satisfies ErrorResponse)
      }
    })()

    if (!decodedAssetId) return

    const asset = getAsset(decodedAssetId)
    if (!asset) {
      res.status(404).json({ error: `Asset not found: ${decodedAssetId}` } satisfies ErrorResponse)
      return
    }

    res.json(asset)
  } catch (error) {
    console.error('Error in getAssetById:', error)
    res.status(500).json({ error: 'Internal server error' } satisfies ErrorResponse)
  }
}
