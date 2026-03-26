import { z } from 'zod'

import { registry } from '../../registry'

export type SwapServiceStatus = {
  status: 'IDLE' | 'PENDING' | 'SUCCESS' | 'FAILED'
  sellTxHash?: string
  buyTxHash?: string
  statusMessage: string
  isAffiliateVerified?: boolean
  affiliateVerificationDetails?: {
    hasAffiliate: boolean
    affiliateBps?: number
    affiliateAddress?: string
  }
}

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
