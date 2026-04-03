import type * as types from '@shapeshiftoss/types'
import { z } from 'zod'

import { registry } from '../../registry'

export const AssetSchema: z.ZodType<types.Asset> = registry.register(
  'Asset',
  z.object({
    assetId: z.string().openapi({ example: 'eip155:1/slip44:60' }),
    chainId: z.string().openapi({ example: 'eip155:1' }),
    name: z.string().openapi({ example: 'Ethereum' }),
    symbol: z.string().openapi({ example: 'ETH' }),
    precision: z.number().openapi({ example: 18 }),
    color: z.string().openapi({ example: '#5C6BC0' }),
    icon: z.string().openapi({
      example: 'https://assets.coincap.io/assets/icons/eth@2x.png',
    }),
    explorer: z.string().openapi({ example: 'https://etherscan.io' }),
    explorerAddressLink: z.string().openapi({ example: 'https://etherscan.io/address/' }),
    explorerTxLink: z.string().openapi({ example: 'https://etherscan.io/tx/' }),
    relatedAssetKey: z.string().nullable(),
  }),
)

export const AssetsListRequestSchema = z.object({
  chainId: z.string().optional().openapi({ example: 'eip155:1' }),
  limit: z.coerce.number().min(1).max(1000).optional().default(100).openapi({ example: 100 }),
  offset: z.coerce.number().min(0).optional().default(0).openapi({ example: 0 }),
})

export const AssetsListResponseSchema = z.object({
  assets: z.array(AssetSchema),
  timestamp: z.number(),
})

export const AssetRequestSchema = z.object({
  assetId: z.string().min(1).openapi({ example: 'eip155:1/slip44:60' }),
})

export const AssetCountRequestSchema = z.object({
  chainId: z.string().optional().openapi({ example: 'eip155:1' }),
})

export const AssetCountResponseSchema = z.object({
  count: z.number().openapi({ example: 5000 }),
  timestamp: z.number(),
})

export type Asset = z.infer<typeof AssetSchema>
export type AssetRequest = z.infer<typeof AssetRequestSchema>
export type AssetsListRequest = z.infer<typeof AssetsListRequestSchema>
export type AssetsListResponse = z.infer<typeof AssetsListResponseSchema>
export type AssetCountResponse = z.infer<typeof AssetCountResponseSchema>
