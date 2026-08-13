import { z } from 'zod'

import { registry } from '../../registry'
import { BpsFields } from '../../types'

export const RatesRequestSchema = z
  .object({
    sellAssetId: z.string().min(1).openapi({ example: 'eip155:1/slip44:60' }),
    buyAssetId: z.string().min(1).openapi({
      example: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    }),
    sellAmountCryptoBaseUnit: z
      .string()
      .regex(/^\d+$/, 'sellAmountCryptoBaseUnit must be a positive integer')
      .optional()
      .openapi({
        example: '1000000000000000000',
        description:
          'Exact amount of the sell asset to send, in base units. Required unless buyAmountCryptoBaseUnit is given.',
      }),
    buyAmountCryptoBaseUnit: z
      .string()
      .regex(/^(?!0+$)\d+$/, 'buyAmountCryptoBaseUnit must be a positive integer')
      .optional()
      .openapi({
        example: '100000',
        description:
          'Exact amount of the buy asset to receive, in base units. Each rate returns the sell amount needed to get it. Mutually exclusive with sellAmountCryptoBaseUnit; swappers that cannot quote an exact output come back with an ExactOutputNotSupported error.',
      }),
    slippageTolerancePercentageDecimal: z
      .string()
      .regex(
        /^(?:\d+)(?:\.\d+)?$/,
        'slippageTolerancePercentageDecimal must be a non-negative decimal number',
      )
      .optional()
      .openapi({ example: '0.01' }),
    allowNonExecutableSellChain: z
      .enum(['true', 'false'])
      .optional()
      .transform(v => v === 'true')
      .openapi({
        example: 'false',
        description:
          'Return rates even when the sell chain has no executable quote, for clients that fulfil the swap elsewhere. Rates are informational either way; /v1/swap/quote rejects these sell chains regardless.',
      }),
  })
  .refine(
    ({ sellAmountCryptoBaseUnit, buyAmountCryptoBaseUnit }) =>
      (sellAmountCryptoBaseUnit === undefined) !== (buyAmountCryptoBaseUnit === undefined),
    {
      message: 'Provide exactly one of sellAmountCryptoBaseUnit or buyAmountCryptoBaseUnit',
    },
  )

const ApiRateSchema = z.object({
  swapperName: z.string(),
  rate: z.string(),
  buyAmountCryptoBaseUnit: z.string(),
  sellAmountCryptoBaseUnit: z.string(),
  steps: z.number(),
  allowanceContract: z.string().optional().openapi({
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
