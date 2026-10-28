import { z } from 'zod'

import { registry } from '../../registry'
import { EVM_ADDRESS } from '../../types'
import { AssetSchema } from '../assets/types'

const PartnerCodeSchema = z
  .string()
  .trim()
  .min(3)
  .max(32)
  .regex(
    /^[a-z0-9]+$/,
    'partnerCode must be 3–32 lowercase letters or numbers (e.g. mypartnercode)',
  )

// --- Affiliate Config ---

export const AffiliateAddressParamsSchema = z.object({
  address: EVM_ADDRESS,
})

// The wallet that registered the affiliate is its owner; wallets it adds are admins
export const AffiliateRoleSchema = z.enum(['owner', 'admin']).openapi({ example: 'owner' })

export const AffiliateConfigResponseSchema = registry.register(
  'AffiliateConfig',
  z.object({
    id: z.string().openapi({ example: 'abc123' }),
    walletAddress: EVM_ADDRESS,
    receiveAddress: EVM_ADDRESS.nullable(),
    partnerCode: z.string().openapi({ example: 'mypartner' }),
    partnerBps: z.number().openapi({ example: 50 }),
    shapeshiftBps: z.number().openapi({ example: 10 }),
    isActive: z.boolean().openapi({ example: true }),
    createdAt: z.string().datetime().openapi({ example: '2024-01-01T00:00:00.000Z' }),
    updatedAt: z.string().datetime().openapi({ example: '2024-01-01T00:00:00.000Z' }),
    role: AffiliateRoleSchema.optional(),
  }),
)

export const CreateAffiliateRequestSchema = z.object({
  walletAddress: EVM_ADDRESS,
  receiveAddress: EVM_ADDRESS.optional(),
  partnerCode: PartnerCodeSchema,
  bps: z.number().int().min(0).max(1000),
})

export const UpdateAffiliateRequestSchema = z.object({
  receiveAddress: EVM_ADDRESS.optional(),
  bps: z.number().int().min(0).max(1000).optional(),
})

// --- Affiliate Members ---

export const AffiliateMemberParamsSchema = AffiliateAddressParamsSchema.extend({
  memberAddress: EVM_ADDRESS,
})

export const AddAffiliateMemberRequestSchema = z.object({
  walletAddress: EVM_ADDRESS,
})

export const AffiliateMemberSchema = registry.register(
  'AffiliateMember',
  z.object({
    walletAddress: EVM_ADDRESS,
    role: AffiliateRoleSchema,
    addedBy: EVM_ADDRESS.nullable(),
    createdAt: z.string().datetime().openapi({ example: '2024-01-01T00:00:00.000Z' }),
  }),
)

export const AffiliateMembersResponseSchema = registry.register(
  'AffiliateMembers',
  z.object({ members: z.array(AffiliateMemberSchema) }),
)

// --- Affiliate Swaps ---

export const AffiliateFeeStatusSchema = z.enum(['earned', 'pending', 'review', 'failed']).openapi({
  example: 'earned',
  description:
    'earned: the verified on-chain fee that will be paid. pending: still settling, fee is an estimate. review: verified but held for review, fee is an estimate. failed: will not be paid, no fee',
})

export type AffiliateFeeStatus = z.infer<typeof AffiliateFeeStatusSchema>

export const AffiliateFeeStatusReasonSchema = z
  .enum([
    'swap-pending',
    'verification-pending',
    'attribution-pending',
    'no-partner-share',
    'fee-under-review',
    'swap-failed',
    'not-attributed',
    'fee-not-verified',
    'no-affiliate-fee',
    'fee-waived',
  ])
  .nullable()
  .openapi({
    example: null,
    description: 'Why the fee is pending, under review or not paid; null once earned',
  })

export type AffiliateFeeStatusReason = NonNullable<z.infer<typeof AffiliateFeeStatusReasonSchema>>

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
    affiliateFeeStatus: AffiliateFeeStatusSchema,
    affiliateFeeStatusReason: AffiliateFeeStatusReasonSchema,
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
  partnerFeeUsd: z.string().nullable(),
  attributionStatus: z.string(),
  verificationStatus: z.string(),
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
    partnerCode: PartnerCodeSchema,
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
    partnerCode: PartnerCodeSchema,
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
export type AffiliateMemberParams = z.infer<typeof AffiliateMemberParamsSchema>
export type AddAffiliateMemberRequest = z.infer<typeof AddAffiliateMemberRequestSchema>
export type AffiliateMember = z.infer<typeof AffiliateMemberSchema>
export type AffiliateMembersResponse = z.infer<typeof AffiliateMembersResponseSchema>
export type AffiliateSwap = z.infer<typeof AffiliateSwapSchema>
export type SwapServiceAffiliateSwap = z.infer<typeof SwapServiceAffiliateSwapSchema>
export type AffiliateSwapsRequest = z.infer<typeof AffiliateSwapsRequestSchema>
export type AffiliateSwapsResponse = z.infer<typeof AffiliateSwapsResponseSchema>
export type AffiliateStatsRequest = z.infer<typeof AffiliateStatsRequestSchema>
export type AffiliateStatsResponse = z.infer<typeof AffiliateStatsResponseSchema>
