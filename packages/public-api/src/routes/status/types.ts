import { z } from 'zod'

import { registry } from '../../registry'

export const SwapServiceStatusSchema = z.object({
  status: z.enum(['IDLE', 'PENDING', 'SUCCESS', 'FAILED']),
  sellTxHash: z.string().optional(),
  buyTxHash: z.string().optional(),
  statusMessage: z.string(),
  isAffiliateVerified: z.boolean().optional(),
  affiliateVerificationDetails: z
    .object({
      hasAffiliate: z.boolean(),
      affiliateBps: z.number().optional(),
      affiliateAddress: z.string().optional(),
    })
    .optional(),
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
    affiliateAddress: z.string().optional(),
    affiliateBps: z.string(),
    registeredAt: z.number().optional(),
    buyTxHash: z.string().optional(),
    isAffiliateVerified: z.boolean().optional(),
  }),
)

export type StatusRequest = z.infer<typeof StatusRequestSchema>
export type SwapStatusResponse = z.infer<typeof SwapStatusResponseSchema>
