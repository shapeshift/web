import '../setupZod'

import { OpenApiGeneratorV3, OpenAPIRegistry } from '@asteasolutions/zod-to-openapi'
import { z } from 'zod'

import { AffiliateStatsRequestSchema } from '../routes/affiliate'
import { AssetRequestSchema, AssetsListRequestSchema } from '../routes/assets'
import { QuoteRequestSchema } from '../routes/quote'
import { RatesRequestSchema } from '../routes/rates'
import { RegisterRequestSchema } from '../routes/register'
import { StatusRequestSchema } from '../routes/status'

export const registry = new OpenAPIRegistry()

// Register reusable schemas
// We should probably define the response schemas with Zod too, but for now we'll do best effort with the request schemas
// and basic response structures.

// --- Definitions ---

// Asset
const AssetSchema = registry.register(
  'Asset',
  z.object({
    assetId: z.string().openapi({ example: 'eip155:1/slip44:60' }),
    chainId: z.string().openapi({ example: 'eip155:1' }),
    name: z.string().openapi({ example: 'Ethereum' }),
    symbol: z.string().openapi({ example: 'ETH' }),
    precision: z.number().openapi({ example: 18 }),
    color: z.string().openapi({ example: '#5C6BC0' }),
    icon: z.string().openapi({
      example: 'https://assets.coincap.io/assets/icons/eth@2x.png',
    }),
    explorer: z.string().openapi({ example: 'https://etherscan.io' }),
    explorerAddressLink: z.string().openapi({ example: 'https://etherscan.io/address/' }),
    explorerTxLink: z.string().openapi({ example: 'https://etherscan.io/tx/' }),
  }),
)

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

const QuoteStepSchema = registry.register(
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

// Quote Response
const QuoteResponseSchema = registry.register(
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
    steps: z.array(QuoteStepSchema),
    expiresAt: z.number(),
  }),
)

const ChainTypeSchema = z.enum([
  'evm',
  'utxo',
  'cosmos',
  'solana',
  'tron',
  'sui',
  'near',
  'starknet',
  'ton',
])

const ChainSchema = registry.register(
  'Chain',
  z.object({
    chainId: z.string().openapi({ example: 'eip155:1' }),
    name: z.string().openapi({ example: 'Ethereum' }),
    type: ChainTypeSchema.openapi({ example: 'evm' }),
    symbol: z.string().openapi({ example: 'ETH' }),
    precision: z.number().openapi({ example: 18 }),
    color: z.string().openapi({ example: '#5C6BC0' }),
    networkColor: z.string().optional().openapi({ example: '#5C6BC0' }),
    icon: z.string().optional().openapi({
      example:
        'https://rawcdn.githack.com/trustwallet/assets/32e51d582a890b3dd3135fe3ee7c20c2fd699a6d/blockchains/ethereum/info/logo.png',
    }),
    networkIcon: z.string().optional().openapi({
      example:
        'https://rawcdn.githack.com/trustwallet/assets/32e51d582a890b3dd3135fe3ee7c20c2fd699a6d/blockchains/ethereum/info/logo.png',
    }),
    explorer: z.string().openapi({ example: 'https://etherscan.io' }),
    explorerAddressLink: z.string().openapi({ example: 'https://etherscan.io/address/' }),
    explorerTxLink: z.string().openapi({ example: 'https://etherscan.io/tx/' }),
    nativeAssetId: z.string().openapi({ example: 'eip155:1/slip44:60' }),
  }),
)

// Rate Response
const RateResponseSchema = registry.register(
  'RateResponse',
  z.object({
    rates: z.array(
      z.object({
        swapperName: z.string(),
        rate: z.string(),
        buyAmountCryptoBaseUnit: z.string(),
        sellAmountCryptoBaseUnit: z.string(),
        steps: z.number(),
        estimatedExecutionTimeMs: z.number().optional(),
        priceImpactPercentageDecimal: z.string().optional(),
        affiliateBps: z.string(),
        networkFeeCryptoBaseUnit: z.string().optional(),
        error: z
          .object({
            code: z.string(),
            message: z.string(),
          })
          .optional(),
      }),
    ),
    timestamp: z.number(),
    expiresAt: z.number(),
    affiliateAddress: z
      .string()
      .optional()
      .openapi({ example: '0x0000000000000000000000000000000000000001' }),
  }),
)

// --- Paths ---

registry.registerPath({
  method: 'get',
  path: '/v1/chains',
  summary: 'List supported chains',
  description: 'Get a list of all supported blockchain networks, sorted alphabetically by name.',
  tags: ['Chains'],
  responses: {
    200: {
      description: 'List of chains',
      content: {
        'application/json': {
          schema: z.object({
            chains: z.array(ChainSchema),
            timestamp: z.number(),
          }),
        },
      },
    },
  },
})

registry.registerPath({
  method: 'get',
  path: '/v1/chains/count',
  summary: 'Get chain count',
  description: 'Get the total number of supported blockchain networks.',
  tags: ['Chains'],
  responses: {
    200: {
      description: 'Chain count',
      content: {
        'application/json': {
          schema: z.object({
            count: z.number().openapi({ example: 28 }),
            timestamp: z.number(),
          }),
        },
      },
    },
  },
})

// GET /v1/assets
registry.registerPath({
  method: 'get',
  path: '/v1/assets',
  summary: 'List supported assets',
  description: 'Get a list of all supported assets, optionally filtered by chain.',
  tags: ['Assets'],
  request: {
    query: AssetsListRequestSchema,
  },
  responses: {
    200: {
      description: 'List of assets',
      content: {
        'application/json': {
          schema: z.object({
            assets: z.array(AssetSchema),
            timestamp: z.number(),
          }),
        },
      },
    },
  },
})

// GET /v1/assets/{assetId}
registry.registerPath({
  method: 'get',
  path: '/v1/assets/{assetId}',
  summary: 'Get asset by ID',
  description: 'Get details of a specific asset by its ID (URL encoded).',
  tags: ['Assets'],
  request: {
    params: AssetRequestSchema,
  },
  responses: {
    200: {
      description: 'Asset details',
      content: {
        'application/json': {
          schema: AssetSchema,
        },
      },
    },
    404: {
      description: 'Asset not found',
    },
  },
})

const AffiliateAddressHeaderSchema = z
  .string()
  .optional()
  .openapi({
    param: {
      name: 'X-Affiliate-Address',
      in: 'header',
      description:
        'Your Arbitrum address for affiliate fee attribution. Optional — endpoints work without it.',
      example: '0x0000000000000000000000000000000000000001',
    },
  })

const AffiliateBpsHeaderSchema = z
  .string()
  .optional()
  .openapi({
    param: {
      name: 'X-Affiliate-Bps',
      in: 'header',
      description:
        'Custom affiliate fee in basis points (0-1000). Defaults to 10 (0.1%). Can be used independently of X-Affiliate-Address.',
      example: '10',
    },
  })

// GET /v1/swap/rates
registry.registerPath({
  method: 'get',
  path: '/v1/swap/rates',
  summary: 'Get swap rates',
  description:
    'Get informative swap rates from all available swappers. This does not create a transaction.',
  tags: ['Swaps'],
  request: {
    headers: z.object({
      'X-Affiliate-Address': AffiliateAddressHeaderSchema,
      'X-Affiliate-Bps': AffiliateBpsHeaderSchema,
    }),
    query: RatesRequestSchema,
  },
  responses: {
    200: {
      description: 'Swap rates',
      content: {
        'application/json': {
          schema: RateResponseSchema,
        },
      },
    },
    400: {
      description: 'Invalid request',
    },
  },
})

// POST /v1/swap/quote
registry.registerPath({
  method: 'post',
  path: '/v1/swap/quote',
  summary: 'Get executable quote',
  description:
    'Get an executable quote for a swap, including transaction data. Requires a specific swapper name.',
  tags: ['Swaps'],
  request: {
    headers: z.object({
      'X-Affiliate-Address': AffiliateAddressHeaderSchema,
      'X-Affiliate-Bps': AffiliateBpsHeaderSchema,
    }),
    body: {
      content: {
        'application/json': {
          schema: QuoteRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Swap quote',
      content: {
        'application/json': {
          schema: QuoteResponseSchema,
        },
      },
    },
    400: {
      description: 'Invalid request or unavailable swapper',
    },
  },
})

const RegisterResponseSchema = registry.register(
  'RegisterResponse',
  z.object({
    quoteId: z.string().uuid(),
    txHash: z.string(),
    chainId: z.string(),
    status: z.enum(['submitted', 'pending', 'confirmed', 'failed']),
    swapperName: z.string(),
  }),
)

const SwapStatusResponseSchema = registry.register(
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
  }),
)

registry.registerPath({
  method: 'post',
  path: '/v1/swap/register',
  summary: 'Register swap transaction',
  description:
    'Bind a transaction hash to a previously obtained quote. This registers the swap for status tracking and affiliate attribution. Rate limited to 10 requests per second per affiliate.',
  tags: ['Swaps'],
  request: {
    headers: z.object({ 'X-Affiliate-Address': AffiliateAddressHeaderSchema }),
    body: {
      content: {
        'application/json': {
          schema: RegisterRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Swap registered successfully',
      content: {
        'application/json': {
          schema: RegisterResponseSchema,
        },
      },
    },
    400: {
      description: 'Invalid request or chain mismatch',
    },
    403: {
      description: 'Affiliate address mismatch',
    },
    404: {
      description: 'Quote not found or expired',
    },
    409: {
      description: 'Quote already bound to a different transaction',
    },
    429: {
      description: 'Rate limit exceeded',
    },
  },
})

registry.registerPath({
  method: 'get',
  path: '/v1/swap/status',
  summary: 'Get swap status',
  description:
    'Look up the current status of a swap by its quote ID. Optionally pass txHash to verify it matches the registered transaction.',
  tags: ['Swaps'],
  request: {
    headers: z.object({ 'X-Affiliate-Address': AffiliateAddressHeaderSchema }),
    query: StatusRequestSchema,
  },
  responses: {
    200: {
      description: 'Swap status',
      content: {
        'application/json': {
          schema: SwapStatusResponseSchema,
        },
      },
    },
    400: {
      description: 'Invalid request parameters',
    },
    404: {
      description: 'Quote not found or expired',
    },
    409: {
      description: 'Transaction hash mismatch',
    },
  },
})

const AffiliateStatsResponseSchema = registry.register(
  'AffiliateStatsResponse',
  z.object({
    address: z.string().openapi({ example: '0x1234567890123456789012345678901234567890' }),
    totalSwaps: z.number().openapi({ example: 42 }),
    totalVolumeUsd: z.string().openapi({ example: '12345.67' }),
    totalFeesEarnedUsd: z.string().openapi({ example: '44.44' }),
    timestamp: z.number().openapi({ example: 1708700000000 }),
  }),
)

registry.registerPath({
  method: 'get',
  path: '/v1/affiliate/stats',
  summary: 'Get affiliate statistics',
  description:
    'Retrieve aggregated swap statistics for an affiliate address. Returns total swaps, volume, and fees earned. Supports optional date range filtering.',
  tags: ['Affiliate'],
  request: {
    query: AffiliateStatsRequestSchema,
  },
  responses: {
    200: {
      description: 'Affiliate statistics',
      content: {
        'application/json': {
          schema: AffiliateStatsResponseSchema,
        },
      },
    },
    400: {
      description: 'Invalid address format',
    },
    503: {
      description: 'Swap service unavailable',
    },
  },
})

export const generateOpenApiDocument = () => {
  const generator = new OpenApiGeneratorV3(registry.definitions)

  return generator.generateDocument({
    openapi: '3.0.0',
    info: {
      version: '1.0.0',
      title: 'ShapeShift Public API',
      description: `The ShapeShift Public API enables developers to integrate multi-chain swap functionality into their applications. Access rates from multiple DEX aggregators and execute swaps across supported blockchains.

## Integration Overview

### 1. Get Supported Chains
First, fetch the list of supported blockchain networks:
\`\`\`
GET /v1/chains
\`\`\`

### 2. Get Supported Assets
Fetch the list of supported assets to populate your UI:
\`\`\`
GET /v1/assets
\`\`\`

### 3. Get Swap Rates
When a user wants to swap, fetch rates from all available swappers to find the best deal:
\`\`\`
GET /v1/swap/rates?sellAssetId=eip155:1/slip44:60&buyAssetId=eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48&sellAmountCryptoBaseUnit=1000000000000000000
X-Affiliate-Address: 0xYourArbitrumAddress (optional)
\`\`\`
This returns rates from THORChain, 0x, CoW Swap, and other supported swappers.

### 4. Get Executable Quote
Once the user selects a rate, request an executable quote with transaction data:
\`\`\`
POST /v1/swap/quote
X-Affiliate-Address: 0xYourArbitrumAddress (optional)

{
  "sellAssetId": "eip155:1/slip44:60",
  "buyAssetId": "bip122:000000000019d6689c085ae165831e93/slip44:0",
  "sellAmountCryptoBaseUnit": "1000000000000000000",
  "swapperName": "Relay",
  "receiveAddress": "bc1q...",
  "sendAddress": "0x..."
}
\`\`\`

### 5. Execute the Swap
Use the returned \`transactionData\` to build and sign a transaction with the user's wallet, then broadcast it to the network.

### 6. Register the Swap (Optional)
After broadcasting, register the transaction for status tracking and affiliate attribution:
\`\`\`
POST /v1/swap/register
X-Affiliate-Address: 0xYourArbitrumAddress

{
  "quoteId": "<quoteId from step 4>",
  "txHash": "0x...",
  "chainId": "eip155:1"
}
\`\`\`

### 7. Check Swap Status (Optional)
Poll the status endpoint to track swap progress:
\`\`\`
GET /v1/swap/status?quoteId=<quoteId>
\`\`\`

## Affiliate Tracking (Optional)
To attribute swaps to your project, include your Arbitrum address in the \`X-Affiliate-Address\` header. This is optional — all endpoints work without it.

## Asset IDs
Assets use CAIP-19 format: \`{chainId}/{assetNamespace}:{assetReference}\`
- Native ETH: \`eip155:1/slip44:60\`
- USDC on Ethereum: \`eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48\`
- Native BTC: \`bip122:000000000019d6689c085ae165831e93/slip44:0\`
`,
    },
    servers: [{ url: 'https://api.shapeshift.com' }, { url: 'http://localhost:3001' }],
  })
}
