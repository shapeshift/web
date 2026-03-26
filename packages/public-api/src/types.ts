import type {
  CosmosTransactionData,
  EvmTransactionData,
  Permit2SignatureRequired,
  SolanaTransactionData,
  TransactionData,
  UtxoDepositTransactionData,
  UtxoPsbtTransactionData,
  UtxoTransactionData,
} from '@shapeshiftoss/types'
import { z } from 'zod'

import { RateLimitErrorCode } from './middleware/rateLimit'
import { registry } from './registry'

export type {
  CosmosTransactionData,
  EvmTransactionData,
  Permit2SignatureRequired,
  SolanaTransactionData,
  TransactionData,
  UtxoDepositTransactionData,
  UtxoPsbtTransactionData,
  UtxoTransactionData,
}

export type AffiliateInfo = {
  affiliateAddress?: string
  affiliateBps: string
  partnerCode?: string
}

declare global {
  namespace Express {
    interface Request {
      affiliateInfo?: AffiliateInfo
    }
  }
}

export type ErrorResponse = {
  error: string
  code?: string
  details?: unknown
}

export const RateLimitErrorSchema = registry.register(
  'RateLimitError',
  z.object({
    error: z.string().openapi({ example: 'Too many requests, please try again later' }),
    code: z
      .nativeEnum(RateLimitErrorCode)
      .openapi({ example: RateLimitErrorCode.RateLimitExceeded }),
  }),
)

export const rateLimitResponse = {
  description: 'Rate limit exceeded. Includes Retry-After header with seconds until reset.',
  content: { 'application/json': { schema: RateLimitErrorSchema } },
  headers: {
    'Retry-After': {
      description: 'Seconds until the rate limit window resets',
      schema: { type: 'integer' as const, example: 30 },
    },
    'RateLimit-Limit': {
      description: 'Maximum requests allowed per window',
      schema: { type: 'integer' as const, example: 60 },
    },
    'RateLimit-Remaining': {
      description: 'Requests remaining in the current window',
      schema: { type: 'integer' as const, example: 0 },
    },
    'RateLimit-Reset': {
      description: 'Seconds until the rate limit window resets',
      schema: { type: 'integer' as const, example: 30 },
    },
  },
}

export const EVM_ADDRESS = z
  .string()
  .regex(/^0x[0-9a-fA-F]{40}$/, 'must be a valid EVM address')
  .openapi({ example: '0x1234567890123456789012345678901234567890' })

export const PartnerCodeHeaderSchema = z.object({
  'X-Partner-Code': z
    .string()
    .optional()
    .openapi({
      param: {
        name: 'X-Partner-Code',
        in: 'header',
        description:
          'Partner code for affiliate fee attribution. The API resolves the code to the registered affiliate address and BPS. Register a code at the affiliate dashboard.',
        example: 'vultisig',
      },
    }),
})
