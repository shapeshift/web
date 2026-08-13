import { z } from 'zod'

import { registry } from '../../registry'
import { BpsFields, EVM_ADDRESS } from '../../types'

// The swap record itself, so every column swap-service leaves unset arrives as null
export const SwapServiceStatusSchema = z.object({
  swapperName: z.string(),
  sellAsset: z.object({ assetId: z.string() }),
  buyAsset: z.object({ assetId: z.string() }),
  sellAmountCryptoBaseUnit: z.string(),
  expectedBuyAmountCryptoBaseUnit: z.string(),
  partnerAddress: z.string().nullable(),
  partnerBps: z.number().int().min(0),
  shapeshiftBps: z.number().int().min(0),
  affiliateBps: z.number().int().min(0),
  createdAt: z
    .union([z.string().datetime(), z.date()])
    .transform((createdAt: string | Date): number => new Date(createdAt).getTime()),
  status: z.enum(['IDLE', 'PENDING', 'SUCCESS', 'FAILED']),
  sellTxHash: z.string().nullable(),
  buyTxHash: z.string().nullable(),
  statusMessage: z.string().nullable(),
  isAffiliateVerified: z.boolean().nullable(),
  affiliateVerificationDetails: z
    .object({
      hasAffiliate: z.boolean(),
      affiliateBps: z.number().optional(),
      // Chain-native: an EVM treasury, a NEAR account, a THORChain address
      affiliateAddress: z.string().optional(),
    })
    .nullable(),
})

export type SwapServiceStatus = z.infer<typeof SwapServiceStatusSchema>

export const StatusRequestSchema = z.object({
  quoteId: z.string().uuid(),
  txHash: z.string().min(1).max(128).optional(),
})

export const SwapStatusResponseSchema = registry.register(
  'SwapStatusResponse',
  z.object({
    quoteId: z.string().uuid(),
    txHash: z.string().optional(),
    status: z.enum(['pending', 'submitted', 'confirmed', 'failed']),
    swapperName: z.string(),
    sellAssetId: z.string(),
    buyAssetId: z.string(),
    sellAmountCryptoBaseUnit: z.string(),
    buyAmountAfterFeesCryptoBaseUnit: z.string(),
    partnerAddress: EVM_ADDRESS.optional(),
    ...BpsFields,
    registeredAt: z.number().optional(),
    buyTxHash: z.string().optional(),
    isAffiliateVerified: z.boolean().optional(),
  }),
)

export type StatusRequest = z.infer<typeof StatusRequestSchema>
export type SwapStatusResponse = z.infer<typeof SwapStatusResponseSchema>
