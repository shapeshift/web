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
  allowanceContract: z
    .string()
    .optional()
    .openapi({
      example: '0xdef1c0ded9bec7f1a1670819833240f027b25eff',
      description:
        'First-hop approval spender for the sell token. Non-empty means executing this swapper pulls the sell token from an approved allowance - clients wanting to check or set an allowance manually before quoting can use it directly. Empty or absent means no approval is involved.',
    }),
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
