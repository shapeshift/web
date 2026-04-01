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
    bps: z.number().openapi({ example: 30 }),
    isActive: z.boolean().openapi({ example: true }),
    createdAt: z.string().openapi({ example: '2024-01-01T00:00:00.000Z' }),
    updatedAt: z.string().openapi({ example: '2024-01-01T00:00:00.000Z' }),
  }),
)

export const CreateAffiliateRequestSchema = z.object({
  walletAddress: EVM_ADDRESS,
  receiveAddress: EVM_ADDRESS.optional(),
  partnerCode: z.string().trim().min(1, 'partnerCode must not be empty').optional(),
  bps: z.number().int().min(0).optional(),
})

export const UpdateAffiliateRequestSchema = z.object({
  receiveAddress: EVM_ADDRESS.optional(),
  bps: z.number().int().min(0).optional(),
})

export const ClaimPartnerCodeRequestSchema = z.object({
  walletAddress: EVM_ADDRESS,
  partnerCode: z.string().trim().min(1, 'partnerCode must not be empty'),
})

// --- Affiliate Swaps ---

export const AffiliateSwapItemSchema = registry.register(
  'AffiliateSwapItem',
  z.object({
    swapId: z.string().openapi({ example: 'swap-uuid-1234' }),
    status: z.string().openapi({ example: 'completed' }),
    sellAsset: AssetSchema,
    buyAsset: AssetSchema,
    sellAmountCryptoPrecision: z.string().openapi({ example: '1000000000000000000' }),
    expectedBuyAmountCryptoPrecision: z.string().openapi({ example: '950000000' }),
    actualBuyAmountCryptoPrecision: z.string().nullable().openapi({ example: '948000000' }),
    sellAmountUsd: z.string().nullable().openapi({ example: '1234.56' }),
    affiliateBps: z.string().nullable().openapi({ example: '30' }),
    affiliateFeeUsd: z.string().nullable().openapi({ example: '3.70' }),
    swapperName: z.string().openapi({ example: 'THORChain' }),
    sellTxHash: z.string().nullable().openapi({ example: '0xabc123' }),
    createdAt: z.string().openapi({ example: '2024-01-01T00:00:00.000Z' }),
  }),
)

export const AffiliateSwapsRequestSchema = z
  .object({
    address: EVM_ADDRESS,
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0),
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
    swaps: z.array(AffiliateSwapItemSchema),
    total: z.number().openapi({ example: 100 }),
    limit: z.number().openapi({ example: 50 }),
    offset: z.number().openapi({ example: 0 }),
  }),
)

// --- Affiliate Stats ---

export const AffiliateFeeResponseSchema = z.object({
  affiliateAddress: EVM_ADDRESS,
  swapCount: z.number(),
  totalSwapVolumeUsd: z.string(),
  totalFeesCollectedUsd: z.string(),
  referrerCommissionUsd: z.string(),
})

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
    address: EVM_ADDRESS,
    totalSwaps: z.number().openapi({ example: 42 }),
    totalVolumeUsd: z.string().openapi({ example: '12345.67' }),
    totalFeesEarnedUsd: z.string().openapi({ example: '44.44' }),
    timestamp: z.number().openapi({ example: 1708700000000 }),
  }),
)

// --- Inferred types ---

export type AffiliateAddressParams = z.infer<typeof AffiliateAddressParamsSchema>
export type AffiliateConfig = z.infer<typeof AffiliateConfigResponseSchema>
export type CreateAffiliateRequest = z.infer<typeof CreateAffiliateRequestSchema>
export type UpdateAffiliateRequest = z.infer<typeof UpdateAffiliateRequestSchema>
export type ClaimPartnerCodeRequest = z.infer<typeof ClaimPartnerCodeRequestSchema>
export type AffiliateSwapItem = z.infer<typeof AffiliateSwapItemSchema>
export type AffiliateSwapsRequest = z.infer<typeof AffiliateSwapsRequestSchema>
export type AffiliateSwapsResponse = z.infer<typeof AffiliateSwapsResponseSchema>
export type AffiliateStatsRequest = z.infer<typeof AffiliateStatsRequestSchema>
export type AffiliateStatsResponse = z.infer<typeof AffiliateStatsResponseSchema>
