import { z } from 'zod'

import { registry } from '../../registry'
import { BpsFields } from '../../types'
import { AssetSchema } from '../assets/types'

const EvmTransactionDataSchema = z.object({
  type: z.literal('evm').openapi({ example: 'evm' }),
  chainId: z.number().openapi({ example: 1 }),
  to: z.string().openapi({ example: '0xdef1c0ded9bec7f1a1670819833240f027b25eff' }),
  data: z.string().openapi({ example: '0x...' }),
  value: z.string().openapi({ example: '1000000000000000000' }),
  gasLimit: z.string().optional().openapi({ example: '300000' }),
  signatureRequired: z
    .object({
      type: z.literal('zrx_permit2'),
      eip712: z.record(z.unknown()),
    })
    .optional()
    .openapi({
      description:
        'When present, the transaction requires a permit2 signature before broadcast: sign the eip712 payload with eth_signTypedData_v4, then append a 32-byte big-endian signature-length word followed by the signature to `data` (the 0x settler convention). The supplied gasLimit already accounts for the appended signature.',
    }),
})

const SolanaTransactionDataSchema = z.object({
  type: z.literal('solana_instructions').openapi({ example: 'solana_instructions' }),
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

// Sealed multi-signer RFQ tx (maker pre-signed, blockhash pinned) - sign the taker slot as-is
// and broadcast, never rebuild
const SolanaSerializedTxTransactionDataSchema = z.object({
  type: z.literal('solana_serialized_tx').openapi({ example: 'solana_serialized_tx' }),
  serializedTx: z.string(),
})

const UtxoTransactionDataSchema = z.object({
  type: z.literal('utxo').openapi({ example: 'utxo' }),
  to: z.string(),
  opReturnData: z.string().optional(),
  value: z.string(),
})

const CosmosSdkMsgSendTransactionDataSchema = z.object({
  type: z.literal('cosmossdk_msg_send').openapi({ example: 'cosmossdk_msg_send' }),
  chainId: z.string(),
  to: z.string(),
  denom: z.string().openapi({ example: 'uatom' }),
  value: z.string(),
  memo: z.string().optional(),
})

// A native MsgDeposit (e.g. THORChain/MAYAChain) rather than a bank send
const CosmosSdkMsgDepositTransactionDataSchema = z.object({
  type: z.literal('cosmossdk_msg_deposit').openapi({ example: 'cosmossdk_msg_deposit' }),
  chainId: z.string(),
  value: z.string(),
  memo: z.string(),
  coin: z.string().openapi({ example: 'THOR.RUNE' }),
})

const TransactionDataSchema = z.discriminatedUnion('type', [
  EvmTransactionDataSchema,
  SolanaTransactionDataSchema,
  SolanaSerializedTxTransactionDataSchema,
  UtxoTransactionDataSchema,
  CosmosSdkMsgSendTransactionDataSchema,
  CosmosSdkMsgDepositTransactionDataSchema,
])

export const ApprovalInfoSchema = z.object({
  isRequired: z.boolean().openapi({ example: true }),
  spender: z.string().openapi({ example: '0xdef1c0ded9bec7f1a1670819833240f027b25eff' }),
  approvalTxs: z
    .array(
      z.object({
        to: z.string().openapi({ example: '0xdac17f958d2ee523a2206206994597c13d831ec7' }),
        data: z.string().openapi({ example: '0x095ea7b3...' }),
        value: z.string().openapi({ example: '0' }),
      }),
    )
    .openapi({
      description:
        "Ready-to-sign approval transactions in broadcast order, empty when the current allowance already covers the amount. Approvals are exact - sized to the step's sellAmountCryptoBaseUnit and consumed by the swap's execution. Usually a single approve; tokens that require resetting a non-zero allowance before changing it (e.g. USDT) get a preceding approve(spender, 0). Sign and broadcast sequentially, waiting for each to confirm. Clients preferring an unlimited approval can build their own approve to `spender` instead.",
    }),
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

export const QuoteRequestSchema = z
  .object({
    sellAssetId: z.string().min(1).openapi({ example: 'eip155:1/slip44:60' }),
    buyAssetId: z.string().min(1).openapi({
      example: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
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
          'Exact amount of the buy asset to receive, in base units. The sell amount you must send is derived from it and returned on the quote. Mutually exclusive with sellAmountCryptoBaseUnit, and rejected for swappers that cannot quote an exact output.',
      }),
    receiveAddress: z
      .string()
      .min(1)
      .openapi({ example: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq' }),
    sendAddress: z.string().min(1).openapi({
      example: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      description:
        "The user's address on the sell chain: the swap is funded from it, and refunds return to it. When the quote carries a depositAddress nothing is sent from it - the deposit can arrive from any wallet - so it only receives refunds, and must still be an address the user controls. For UTXO chains, use the account's first receive address (m/84'/0'/0'/0/0).",
    }),
    swapperName: z.string().min(1).openapi({ example: 'Relay' }),
    slippageTolerancePercentageDecimal: z.string().optional().openapi({ example: '0.01' }),
    accountNumber: z.coerce.number().optional().default(0).openapi({ example: 0 }),
    // UTXO sells only: account xpub used to compute an exact network fee from the wallet's utxo set.
    // Without it the returned network fee is a rough estimate.
    xpub: z.string().optional().openapi({
      example:
        'zpub6rFR7y4Q2AijBEqTUquhVz398htDFrtymD9xYYfG1m4wAcvPhXNfE3EfH1r1ADqtfSdVCToUG868RvUUkgDKf31mGDtKsAYz2oz2AGutZYs',
    }),
  })
  .refine(
    ({ sellAmountCryptoBaseUnit, buyAmountCryptoBaseUnit }) =>
      (sellAmountCryptoBaseUnit === undefined) !== (buyAmountCryptoBaseUnit === undefined),
    {
      message: 'Provide exactly one of sellAmountCryptoBaseUnit or buyAmountCryptoBaseUnit',
    },
  )

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
    ...BpsFields,
    slippageTolerancePercentageDecimal: z.string().optional().openapi({ example: '0.01' }),
    networkFeeCryptoBaseUnit: z.string().optional().openapi({ example: '23000' }),
    approval: ApprovalInfoSchema,
    steps: z.array(QuoteStepSchema),
    depositAddress: z.string().optional().openapi({
      example: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
      description:
        'Present when this quote can be paid by a plain transfer from any wallet: send exactly sellAmountCryptoBaseUnit here before expiresAt, then poll /v1/swap/status with quoteId alone. A deposit sent after expiresAt may be refunded to sendAddress, or lost. Absent means the swap must be signed by the wallet at sendAddress.',
    }),
    expiresAt: z.number().openapi({
      example: 1754265600000,
      description:
        "Epoch ms after which the quote must not be executed - the swapper's own deadline. Broadcasting after it risks a failed swap, or lost funds on an externally paid quote. Request a fresh quote instead.",
    }),
  }),
)

export type ApiQuoteStep = z.infer<typeof QuoteStepSchema>
export type ApprovalInfo = z.infer<typeof ApprovalInfoSchema>
export type QuoteRequest = z.infer<typeof QuoteRequestSchema>
export type QuoteResponse = z.infer<typeof QuoteResponseSchema>
