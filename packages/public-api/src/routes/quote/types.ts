import type { TradeQuote } from '@shapeshiftoss/swapper'
import { z } from 'zod'

import { booleanFromString } from '../../lib/zod'
import { registry } from '../../registry'
import type { ErrorResponse } from '../../types'
import { AssetSchema } from '../assets/types'

export type ThorLikeQuote = TradeQuote & { memo?: string }

export type DepositExtractionContext = {
  memo?: string
  depositAddress?: string
}

export type DepositContextResult =
  | { ok: true; context: DepositExtractionContext }
  | { ok: false; error: ErrorResponse; statusCode: number }

const EvmTransactionDataSchema = z.object({
  type: z.literal('evm').openapi({ example: 'evm' }),
  chainId: z.number().openapi({ example: 1 }),
  to: z.string().openapi({ example: '0xdef1c0ded9bec7f1a1670819833240f027b25eff' }),
  data: z.string().openapi({ example: '0x...' }),
  value: z.string().openapi({ example: '1000000000000000000' }),
  gasLimit: z.string().optional().openapi({ example: '300000' }),
  signatureRequired: z
    .object({
      type: z.literal('permit2'),
      eip712: z.record(z.unknown()),
    })
    .optional(),
})

const SolanaTransactionDataSchema = z.object({
  type: z.literal('solana').openapi({ example: 'solana' }),
  instructions: z.array(
    z.object({
      programId: z.string(),
      keys: z.array(
        z.object({
          pubkey: z.string(),
          isSigner: z.boolean(),
          isWritable: z.boolean(),
        }),
      ),
      data: z.string(),
    }),
  ),
  addressLookupTableAddresses: z.array(z.string()),
})

const UtxoPsbtTransactionDataSchema = z.object({
  type: z.literal('utxo_psbt').openapi({ example: 'utxo_psbt' }),
  psbt: z.string(),
  opReturnData: z.string().optional(),
  depositAddress: z.string().optional(),
  value: z.string().optional(),
})

const UtxoDepositTransactionDataSchema = z.object({
  type: z.literal('utxo_deposit').openapi({ example: 'utxo_deposit' }),
  depositAddress: z.string(),
  memo: z.string(),
  value: z.string(),
})

const CosmosTransactionDataSchema = z.object({
  type: z.literal('cosmos').openapi({ example: 'cosmos' }),
  chainId: z.string(),
  to: z.string(),
  value: z.string(),
  memo: z.string().optional(),
})

const TransactionDataSchema = z.discriminatedUnion('type', [
  EvmTransactionDataSchema,
  SolanaTransactionDataSchema,
  UtxoPsbtTransactionDataSchema,
  UtxoDepositTransactionDataSchema,
  CosmosTransactionDataSchema,
])

export const ApprovalInfoSchema = z.object({
  isRequired: z.boolean().openapi({ example: true }),
  spender: z.string().openapi({ example: '0xdef1c0ded9bec7f1a1670819833240f027b25eff' }),
  approvalTx: z
    .object({
      to: z.string().openapi({ example: '0xdef1c0ded9bec7f1a1670819833240f027b25eff' }),
      data: z.string().openapi({ example: '0x' }),
      value: z.string().openapi({ example: '0' }),
    })
    .optional(),
})

export const QuoteStepSchema = registry.register(
  'QuoteStep',
  z.object({
    sellAsset: AssetSchema,
    buyAsset: AssetSchema,
    sellAmountCryptoBaseUnit: z.string().openapi({ example: '1000000000000000000' }),
    buyAmountAfterFeesCryptoBaseUnit: z.string().openapi({ example: '995000000' }),
    allowanceContract: z
      .string()
      .openapi({ example: '0xdef1c0ded9bec7f1a1670819833240f027b25eff' }),
    estimatedExecutionTimeMs: z.number().optional().openapi({ example: 60000 }),
    source: z.string().openapi({ example: '0x' }),
    transactionData: TransactionDataSchema.optional(),
  }),
)

export const QuoteRequestSchema = z.object({
  sellAssetId: z.string().min(1).openapi({ example: 'eip155:1/slip44:60' }),
  buyAssetId: z.string().min(1).openapi({
    example: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
  }),
  sellAmountCryptoBaseUnit: z.string().min(1).openapi({ example: '1000000000000000000' }),
  receiveAddress: z
    .string()
    .min(1)
    .openapi({ example: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq' }),
  sendAddress: z
    .string()
    .optional()
    .openapi({ example: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' }),
  swapperName: z.string().min(1).openapi({ example: 'Relay' }),
  slippageTolerancePercentageDecimal: z.string().optional().openapi({ example: '0.01' }),
  allowMultiHop: booleanFromString.optional().default(true).openapi({ example: true }),
  accountNumber: z.coerce.number().optional().default(0).openapi({ example: 0 }),
})

export const QuoteResponseSchema = registry.register(
  'QuoteResponse',
  z.object({
    quoteId: z.string().uuid(),
    swapperName: z.string().openapi({ example: '0x' }),
    rate: z.string().openapi({ example: '0.995' }),
    sellAsset: AssetSchema,
    buyAsset: AssetSchema,
    sellAmountCryptoBaseUnit: z.string(),
    buyAmountBeforeFeesCryptoBaseUnit: z.string(),
    buyAmountAfterFeesCryptoBaseUnit: z.string(),
    affiliateBps: z.string().openapi({ example: '10' }),
    affiliateAddress: z
      .string()
      .optional()
      .openapi({ example: '0x0000000000000000000000000000000000000001' }),
    slippageTolerancePercentageDecimal: z.string().optional().openapi({ example: '0.01' }),
    networkFeeCryptoBaseUnit: z.string().optional().openapi({ example: '23000' }),
    approval: ApprovalInfoSchema,
    steps: z.array(QuoteStepSchema),
    expiresAt: z.number(),
  }),
)

export type ApiQuoteStep = z.infer<typeof QuoteStepSchema>
export type ApprovalInfo = z.infer<typeof ApprovalInfoSchema>
export type QuoteRequest = z.infer<typeof QuoteRequestSchema>
export type QuoteResponse = z.infer<typeof QuoteResponseSchema>
