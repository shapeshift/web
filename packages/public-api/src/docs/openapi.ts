import '../setupZod'

import { OpenApiGeneratorV3, OpenAPIRegistry } from '@asteasolutions/zod-to-openapi'
import { z } from 'zod'

import { AssetRequestSchema, AssetsListRequestSchema } from '../routes/assets'
import { QuoteRequestSchema } from '../routes/quote'
import { RatesRequestSchema } from '../routes/rates'

export const registry = new OpenAPIRegistry()

// Register reusable schemas
// We should probably define the response schemas with Zod too, but for now we'll do best effort with the request schemas
// and basic response structures.

// Security Schemes
registry.registerComponent('securitySchemes', 'apiKeyAuth', {
  type: 'apiKey',
  in: 'header',
  name: 'X-API-Key',
})

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

const UtxoTransactionDataSchema = z.object({
  type: z.literal('utxo').openapi({ example: 'utxo' }),
  psbt: z.string(),
  sendAddress: z.string(),
  opReturnData: z.string().optional(),
})

const CosmosTransactionDataSchema = z.object({
  type: z.literal('cosmos').openapi({ example: 'cosmos' }),
  chainId: z.string(),
  to: z.string(),
  value: z.string(),
  memo: z.string().optional(),
})

const CowswapOrderDataSchema = z.object({
  type: z.literal('cowswap').openapi({ example: 'cowswap' }),
  order: z.record(z.unknown()),
  signatureRequired: z.object({
    type: z.literal('eip712'),
    eip712: z.record(z.unknown()),
  }),
})

const TransactionDataSchema = z.discriminatedUnion('type', [
  EvmTransactionDataSchema,
  SolanaTransactionDataSchema,
  UtxoTransactionDataSchema,
  CosmosTransactionDataSchema,
  CowswapOrderDataSchema,
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

// GET /v1/swap/rates
registry.registerPath({
  method: 'get',
  path: '/v1/swap/rates',
  summary: 'Get swap rates',
  description:
    'Get informative swap rates from all available swappers. This does not create a transaction.',
  tags: ['Swaps'],
  security: [{ apiKeyAuth: [] }],
  request: {
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
  security: [{ apiKeyAuth: [] }],
  request: {
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
\`\`\`
This returns rates from THORChain, 0x, CoW Swap, and other supported swappers.

### 4. Get Executable Quote
Once the user selects a rate, request an executable quote with transaction data:
\`\`\`
POST /v1/swap/quote
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

## Authentication
Include your API key in the \`X-API-Key\` header for all swap endpoints.

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
