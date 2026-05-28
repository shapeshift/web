import { z } from 'zod'

import { registry } from '../../registry'
import { BpsFields } from '../../types'

export const RatesRequestSchema = z.object({
  sellAssetId: z.string().min(1).openapi({ example: 'eip155:1/slip44:60' }),
  buyAssetId: z.string().min(1).openapi({
    example: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  }),
  sellAmountCryptoBaseUnit: z
    .string()
    .regex(/^\d+$/, 'sellAmountCryptoBaseUnit must be a positive integer')
    .openapi({ example: '1000000000000000000' }),
  slippageTolerancePercentageDecimal: z
    .string()
    .regex(
      /^(?:\d+)(?:\.\d+)?$/,
      'slippageTolerancePercentageDecimal must be a non-negative decimal number',
    )
    .optional()
    .openapi({ example: '0.01' }),
})

const ApiRateSchema = z.object({
  swapperName: z.string(),
  rate: z.string(),
  buyAmountCryptoBaseUnit: z.string(),
  sellAmountCryptoBaseUnit: z.string(),
  steps: z.number(),
  estimatedExecutionTimeMs: z.number().optional(),
  priceImpactPercentageDecimal: z.string().optional(),
  ...BpsFields,
  networkFeeCryptoBaseUnit: z.string().optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
    })
    .optional(),
})

export const RateResponseSchema = registry.register(
  'RateResponse',
  z.object({
    rates: z.array(ApiRateSchema),
    timestamp: z.number(),
    expiresAt: z.number(),
  }),
)

export type RatesRequest = z.infer<typeof RatesRequestSchema>
export type ApiRate = z.infer<typeof ApiRateSchema>
export type RateResponse = z.infer<typeof RateResponseSchema>
