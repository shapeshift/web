import { z } from 'zod'

import { registry } from '../../registry'
import { EVM_ADDRESS } from '../../types'
import { AssetSchema } from '../assets/types'

// --- Affiliate Config ---

export const AffiliateAddressParamsSchema = z.object({
  address: EVM_ADDRESS,
})

export const AffiliateConfigResponseSchema = registry.register(
  'AffiliateConfig',
  z.object({
    id: z.string().openapi({ example: 'abc123' }),
    walletAddress: EVM_ADDRESS,
    receiveAddress: EVM_ADDRESS.nullable(),
    partnerCode: z.string().nullable().openapi({ example: 'mypartner' }),
    partnerBps: z.number().openapi({ example: 50 }),
    shapeshiftBps: z.number().openapi({ example: 10 }),
    isActive: z.boolean().openapi({ example: true }),
    createdAt: z.string().datetime().openapi({ example: '2024-01-01T00:00:00.000Z' }),
    updatedAt: z.string().datetime().openapi({ example: '2024-01-01T00:00:00.000Z' }),
  }),
)

export const CreateAffiliateRequestSchema = z.object({
  walletAddress: EVM_ADDRESS,
  receiveAddress: EVM_ADDRESS.optional(),
  partnerCode: z
    .string()
    .trim()
    .min(3)
    .max(32)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'partnerCode must be lowercase kebab-case (e.g. my-partner-code)',
    ),
  bps: z.number().int().min(0).max(1000),
})

export const UpdateAffiliateRequestSchema = z.object({
  receiveAddress: EVM_ADDRESS.optional(),
  bps: z.number().int().min(0).optional(),
})

// --- Affiliate Swaps ---

export const AffiliateSwapSchema = registry.register(
  'AffiliateSwap',
  z.object({
    swapId: z.string().openapi({ example: 'swap-uuid-1234' }),
    status: z.string().openapi({ example: 'completed' }),
    sellAsset: AssetSchema,
    buyAsset: AssetSchema,
    sellAmountCryptoPrecision: z.string().openapi({ example: '1.0' }),
    sellAmountUsd: z.string().nullable().openapi({ example: '1234.56' }),
    buyAmountCryptoPrecision: z.string().nullable().openapi({ example: '948.0' }),
    buyAmountUsd: z.string().nullable().openapi({ example: '1234.56' }),
    affiliateFeeAmountUsd: z.string().nullable().openapi({ example: '3.70' }),
    affiliateBps: z.number().int().min(0).openapi({ example: 60 }),
    partnerBps: z.number().int().min(0).nullable().openapi({ example: 20 }),
    shapeshiftBps: z.number().int().min(0).openapi({ example: 10 }),
    swapperName: z.string().openapi({ example: 'THORChain' }),
    sellTxHash: z.string().nullable().openapi({ example: '0xabc123' }),
    buyTxHash: z.string().nullable().openapi({ example: '0xdef456' }),
    isAffiliateVerified: z.boolean().nullable().openapi({ example: true }),
    createdAt: z.string().openapi({ example: '2024-01-01T00:00:00.000Z' }),
  }),
)

export const SwapServiceAffiliateSwapSchema = z.object({
  swapId: z.string(),
  status: z.string(),
  sellAsset: AssetSchema,
  buyAsset: AssetSchema,
  sellAmountCryptoBaseUnit: z.string(),
  sellAssetUsd: z.string().nullable(),
  expectedBuyAmountCryptoBaseUnit: z.string(),
  actualBuyAmountCryptoBaseUnit: z.string().nullable(),
  buyAssetUsd: z.string().nullable(),
  actualAffiliateFeeAmountCryptoBaseUnit: z.string().nullable(),
  affiliateAssetUsd: z.string().nullable(),
  affiliateFeeAssetId: z.string().nullable(),
  affiliateBps: z.number().int().min(0),
  partnerBps: z.number().int().min(0),
  shapeshiftBps: z.number().int().min(0),
  affiliateVerificationDetails: z
    .object({
      hasAffiliate: z.boolean(),
      affiliateBps: z.number().int().min(0).optional(),
      affiliateAddress: z.string().optional(),
      verifiedSellAmountCryptoBaseUnit: z.string().optional(),
    })
    .nullable(),
  swapperName: z.string(),
  sellTxHash: z.string().nullable(),
  buyTxHash: z.string().nullable(),
  isAffiliateVerified: z.boolean().nullable(),
  createdAt: z
    .union([z.string().datetime(), z.date()])
    .transform((createdAt: string | Date): string =>
      createdAt instanceof Date ? createdAt.toISOString() : createdAt,
    ),
})

export const SwapServiceAffiliateSwapsResponseSchema = z.object({
  swaps: z.array(SwapServiceAffiliateSwapSchema),
  nextCursor: z.string().nullable(),
})

export const AffiliateSwapsRequestSchema = z
  .object({
    address: EVM_ADDRESS,
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    cursor: z.string().trim().min(1, 'cursor must not be empty').optional(),
  })
  .refine(
    ({ startDate, endDate }) =>
      !startDate || !endDate || new Date(startDate).getTime() <= new Date(endDate).getTime(),
    {
      message: 'startDate must be before or equal to endDate',
      path: ['startDate'],
    },
  )

export const AffiliateSwapsResponseSchema = registry.register(
  'AffiliateSwapsResponse',
  z.object({
    swaps: z.array(AffiliateSwapSchema),
    nextCursor: z.string().nullable().openapi({ example: 'swap-uuid-1234' }),
  }),
)

// --- Affiliate Stats ---

export const AffiliateStatsRequestSchema = z
  .object({
    address: EVM_ADDRESS,
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  })
  .refine(
    ({ startDate, endDate }) =>
      !startDate || !endDate || new Date(startDate).getTime() <= new Date(endDate).getTime(),
    {
      message: 'startDate must be before or equal to endDate',
      path: ['startDate'],
    },
  )

export const AffiliateStatsResponseSchema = registry.register(
  'AffiliateStatsResponse',
  z.object({
    totalSwaps: z.number().openapi({ example: 42 }),
    totalVolumeUsd: z.string().openapi({ example: '12345.67' }),
    totalFeesEarnedUsd: z.string().openapi({ example: '44.44' }),
  }),
)

// --- Inferred types ---

export type AffiliateAddressParams = z.infer<typeof AffiliateAddressParamsSchema>
export type AffiliateConfig = z.infer<typeof AffiliateConfigResponseSchema>
export type CreateAffiliateRequest = z.infer<typeof CreateAffiliateRequestSchema>
export type UpdateAffiliateRequest = z.infer<typeof UpdateAffiliateRequestSchema>
export type AffiliateSwap = z.infer<typeof AffiliateSwapSchema>
export type SwapServiceAffiliateSwap = z.infer<typeof SwapServiceAffiliateSwapSchema>
export type AffiliateSwapsRequest = z.infer<typeof AffiliateSwapsRequestSchema>
export type AffiliateSwapsResponse = z.infer<typeof AffiliateSwapsResponseSchema>
export type AffiliateStatsRequest = z.infer<typeof AffiliateStatsRequestSchema>
export type AffiliateStatsResponse = z.infer<typeof AffiliateStatsResponseSchema>
