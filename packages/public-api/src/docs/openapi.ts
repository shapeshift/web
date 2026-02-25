import '../setupZod'

import { OpenApiGeneratorV3, OpenAPIRegistry } from '@asteasolutions/zod-to-openapi'
import { z } from 'zod'

import { AffiliateStatsRequestSchema } from '../routes/affiliate'
import { AssetRequestSchema, AssetsListRequestSchema } from '../routes/assets'
import { QuoteRequestSchema } from '../routes/quote'
import { RatesRequestSchema } from '../routes/rates'
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
  method: 'get',
  path: '/v1/swap/status',
  summary: 'Get swap status',
  description:
    'Look up the current status of a swap by its quote ID. Pass txHash on the first call after broadcasting to bind it to the quote and start tracking. Subsequent calls can omit txHash.',
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

  const doc = generator.generateDocument({
    openapi: '3.0.0',
    info: {
      version: '1.0.0',
      title: 'ShapeShift Public API',
      description: `The ShapeShift Public API enables developers to integrate multi-chain swap functionality into their applications. Access rates from multiple DEX aggregators and execute swaps across supported blockchains.

There are two ways to integrate:

1. **Swap Widget SDK** — Drop-in React component with built-in UI, wallet connection, and multi-chain support. Fastest way to integrate.
2. **REST API** — Build your own swap UI using the endpoints below. Full control over UX.

## Affiliate Tracking (Optional)
Include your Arbitrum address in the \`X-Affiliate-Address\` header to attribute swaps for affiliate fee tracking. This is optional — all endpoints work without it.

## Asset IDs
Assets use CAIP-19 format: \`{chainId}/{assetNamespace}:{assetReference}\`
- Native ETH: \`eip155:1/slip44:60\`
- USDC on Ethereum: \`eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48\`
- Native BTC: \`bip122:000000000019d6689c085ae165831e93/slip44:0\`
`,
    },
    servers: [{ url: 'https://api.shapeshift.com' }, { url: 'http://localhost:3001' }],
  })

  const widgetSdkTag = {
    name: 'Swap Widget SDK',
    description: `The \`@shapeshiftoss/swap-widget\` package is a drop-in React component that provides a complete swap interface. It handles asset selection, rate comparison, wallet connection, transaction signing, and status tracking.

## Installation

\`\`\`bash
npm install @shapeshiftoss/swap-widget
# or
yarn add @shapeshiftoss/swap-widget
\`\`\`

**Peer dependencies** (install alongside the widget):

\`\`\`bash
npm install react react-dom
\`\`\`

**CSS** — You must import the widget stylesheet:

\`\`\`tsx
import '@shapeshiftoss/swap-widget/style.css'
\`\`\`

## Quick Start

\`\`\`tsx
import { SwapWidget } from '@shapeshiftoss/swap-widget'
import '@shapeshiftoss/swap-widget/style.css'

function App() {
  return (
    <SwapWidget
      affiliateAddress="0xYourArbitrumAddress"
      theme="dark"
      onSwapSuccess={(txHash) => console.log('Success:', txHash)}
    />
  )
}
\`\`\`

---

## Wallet Connection Modes

The widget supports two wallet connection strategies. Choose the one that matches your application.

### Mode 1: External Wallet (Recommended for dApps)

**Use this if your application already has a wallet connection** (wagmi, ethers, viem, RainbowKit, ConnectKit, AppKit, etc.). Pass the connected wallet to the widget — no duplicate wallet modals.

\`\`\`tsx
import { SwapWidget } from '@shapeshiftoss/swap-widget'
import '@shapeshiftoss/swap-widget/style.css'
import { useWalletClient } from 'wagmi'

function SwapPage() {
  const { data: walletClient } = useWalletClient()

  return (
    <SwapWidget
      walletClient={walletClient}
      affiliateAddress="0xYourArbitrumAddress"
      onConnectWallet={() => {
        // Trigger YOUR app's wallet connection modal
        openYourConnectModal()
      }}
      theme="dark"
    />
  )
}
\`\`\`

| Prop | Purpose |
|------|---------|
| \`walletClient\` | A viem \`WalletClient\` from your existing wallet setup |
| \`onConnectWallet\` | Called when the user clicks "Connect" inside the widget — open your own modal |
| \`enableWalletConnection\` | Leave as \`false\` (default) — the widget won't render its own connect UI |

This mode creates its own read-only wagmi config internally for balance fetching. It does **not** interfere with your application's wagmi provider or AppKit instance.

### Mode 2: Built-in Wallet Connection (Standalone)

**Use this if your page has no wallet infrastructure.** The widget manages wallet connections internally via Reown AppKit, supporting EVM, Bitcoin, and Solana wallets.

\`\`\`tsx
import { SwapWidget } from '@shapeshiftoss/swap-widget'
import '@shapeshiftoss/swap-widget/style.css'

function App() {
  return (
    <SwapWidget
      enableWalletConnection={true}
      walletConnectProjectId="your-project-id"
      affiliateAddress="0xYourArbitrumAddress"
      theme="dark"
    />
  )
}
\`\`\`

Get a WalletConnect project ID at [cloud.walletconnect.com](https://cloud.walletconnect.com).

When \`enableWalletConnection\` is true, the widget:
- Shows a "Connect" button that opens a multi-chain wallet modal
- Supports MetaMask, WalletConnect, Coinbase Wallet, and other EVM wallets
- Supports Bitcoin wallets via WalletConnect
- Supports Phantom, Solflare, and other Solana wallets

> **Important: AppKit Singleton Constraint**
>
> The built-in wallet connection uses Reown AppKit, which is a **global singleton** — only one AppKit instance can exist per page. If your page already uses AppKit or Web3Modal, the widget's modal will conflict with yours.
>
> **If your dApp already has AppKit/Web3Modal**: Use **Mode 1 (External Wallet)** instead. Pass your connected \`walletClient\` to the widget and handle wallet connection yourself.
>
> **If your page has no wallet setup**: Mode 2 works perfectly — the widget is the only AppKit instance on the page.

---

## Props Reference

### Core Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| \`affiliateAddress\` | \`string\` | — | Your Arbitrum address for affiliate fee attribution |
| \`affiliateBps\` | \`string\` | \`"10"\` | Affiliate fee in basis points (0.1% default) |
| \`apiBaseUrl\` | \`string\` | — | Custom API base URL |
| \`theme\` | \`ThemeMode \\| ThemeConfig\` | \`"dark"\` | Theme mode or full theme configuration |
| \`showPoweredBy\` | \`boolean\` | \`true\` | Show "Powered by ShapeShift" branding |
| \`defaultSlippage\` | \`string\` | \`"0.5"\` | Default slippage tolerance percentage |
| \`ratesRefetchInterval\` | \`number\` | \`15000\` | Rate refresh interval in milliseconds |

### Wallet Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| \`walletClient\` | \`WalletClient\` | — | Viem wallet client for EVM transactions (Mode 1) |
| \`enableWalletConnection\` | \`boolean\` | \`false\` | Enable built-in wallet modal (Mode 2) |
| \`walletConnectProjectId\` | \`string\` | — | Required for Mode 2 |
| \`onConnectWallet\` | \`() => void\` | — | Callback when user clicks "Connect" (Mode 1) |
| \`defaultReceiveAddress\` | \`string\` | — | Lock the receive address to a specific value |

### Asset Filtering Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| \`defaultSellAsset\` | \`Asset\` | ETH | Initial sell asset |
| \`defaultBuyAsset\` | \`Asset\` | USDC | Initial buy asset |
| \`allowedChainIds\` | \`ChainId[]\` | all | Restrict both sides to these chains |
| \`disabledChainIds\` | \`ChainId[]\` | \`[]\` | Hide chains from both selectors |
| \`disabledAssetIds\` | \`AssetId[]\` | \`[]\` | Hide assets from both selectors |
| \`sellAllowedChainIds\` | \`ChainId[]\` | — | Restrict sell side to these chains |
| \`buyAllowedChainIds\` | \`ChainId[]\` | — | Restrict buy side to these chains |
| \`sellAllowedAssetIds\` | \`AssetId[]\` | — | Restrict sell side to these assets |
| \`buyAllowedAssetIds\` | \`AssetId[]\` | — | Restrict buy side to these assets |
| \`sellDisabledChainIds\` | \`ChainId[]\` | \`[]\` | Hide chains from sell selector |
| \`buyDisabledChainIds\` | \`ChainId[]\` | \`[]\` | Hide chains from buy selector |
| \`sellDisabledAssetIds\` | \`AssetId[]\` | \`[]\` | Hide assets from sell selector |
| \`buyDisabledAssetIds\` | \`AssetId[]\` | \`[]\` | Hide assets from buy selector |
| \`allowedSwapperNames\` | \`SwapperName[]\` | all | Restrict to specific swappers |
| \`isBuyAssetLocked\` | \`boolean\` | \`false\` | Prevent changing the buy asset |

### Callback Props

| Prop | Type | Description |
|------|------|-------------|
| \`onSwapSuccess\` | \`(txHash: string) => void\` | Called when a swap succeeds |
| \`onSwapError\` | \`(error: Error) => void\` | Called when a swap fails |
| \`onAssetSelect\` | \`(type: 'sell' \\| 'buy', asset: Asset) => void\` | Called when user selects an asset |

---

## Theming

### Simple Mode

\`\`\`tsx
<SwapWidget theme="dark" />
<SwapWidget theme="light" />
\`\`\`

### Custom Theme

\`\`\`tsx
const theme: ThemeConfig = {
  mode: 'dark',
  accentColor: '#3861fb',
  backgroundColor: '#0a0a14',
  cardColor: '#12121c',
  textColor: '#ffffff',
  borderRadius: '12px',
  fontFamily: 'Inter, sans-serif',
  borderColor: '#2a2a3e',
  secondaryTextColor: '#a0a0b0',
  mutedTextColor: '#6b6b80',
  inputColor: '#1a1a2e',
  hoverColor: '#1e1e32',
  buttonVariant: 'filled', // 'filled' or 'outline'
}

<SwapWidget theme={theme} />
\`\`\`

| Property | Type | Description |
|----------|------|-------------|
| \`mode\` | \`'light' \\| 'dark'\` | Base theme mode (required) |
| \`accentColor\` | \`string\` | Buttons, focus states, active elements |
| \`backgroundColor\` | \`string\` | Widget background |
| \`cardColor\` | \`string\` | Card and panel backgrounds |
| \`textColor\` | \`string\` | Primary text |
| \`borderRadius\` | \`string\` | Border radius (e.g. \`'12px'\`) |
| \`fontFamily\` | \`string\` | Font family |
| \`borderColor\` | \`string\` | Border colors |
| \`secondaryTextColor\` | \`string\` | Secondary labels |
| \`mutedTextColor\` | \`string\` | Muted/disabled text |
| \`inputColor\` | \`string\` | Input field background |
| \`hoverColor\` | \`string\` | Hover state background |
| \`buttonVariant\` | \`'filled' \\| 'outline'\` | Button style |

---

## Integration Examples

### Restrict to Ethereum + Polygon Only

\`\`\`tsx
import { SwapWidget, EVM_CHAIN_IDS } from '@shapeshiftoss/swap-widget'

<SwapWidget
  allowedChainIds={[EVM_CHAIN_IDS.ethereum, EVM_CHAIN_IDS.polygon]}
  affiliateAddress="0xYourArbitrumAddress"
  theme="dark"
/>
\`\`\`

### Lock Buy Asset (Payment Widget)

\`\`\`tsx
const usdcAsset = {
  assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  chainId: 'eip155:1',
  symbol: 'USDC',
  name: 'USD Coin',
  precision: 6,
}

<SwapWidget
  defaultBuyAsset={usdcAsset}
  isBuyAssetLocked={true}
  defaultReceiveAddress="0xYourTreasuryAddress"
  affiliateAddress="0xYourArbitrumAddress"
  theme="dark"
/>
\`\`\`

### Use Specific Swappers Only

\`\`\`tsx
import { SwapWidget, SwapperName } from '@shapeshiftoss/swap-widget'

<SwapWidget
  allowedSwapperNames={[SwapperName.Thorchain, SwapperName.Chainflip]}
  theme="dark"
/>
\`\`\`

---

## Exported Hooks

These hooks can be used outside the widget to build custom UI with ShapeShift asset data.

\`\`\`tsx
import {
  useAssets,
  useAssetById,
  useChains,
  useAssetsByChainId,
  useAssetSearch,
} from '@shapeshiftoss/swap-widget'
\`\`\`

| Hook | Return Type | Description |
|------|-------------|-------------|
| \`useAssets()\` | \`{ data: Asset[], isLoading, ... }\` | All available assets |
| \`useAssetById(assetId)\` | \`{ data: Asset \\| undefined, ... }\` | Single asset by CAIP-19 ID |
| \`useChains()\` | \`{ data: ChainInfo[], ... }\` | All chains with native assets |
| \`useAssetsByChainId(chainId)\` | \`{ data: Asset[], ... }\` | All assets on a chain |
| \`useAssetSearch(query, chainId?)\` | \`{ data: Asset[], ... }\` | Search by symbol or name |

All hooks return React Query result objects with \`data\`, \`isLoading\`, \`error\`, \`refetch\`, etc.

## Exported Utilities

\`\`\`tsx
import {
  formatAmount,
  parseAmount,
  truncateAddress,
  isEvmChainId,
  getEvmNetworkId,
  getChainType,
  getChainName,
  getChainIcon,
  getChainColor,
  getBaseAsset,
  getExplorerTxLink,
  EVM_CHAIN_IDS,
  UTXO_CHAIN_IDS,
  COSMOS_CHAIN_IDS,
  OTHER_CHAIN_IDS,
} from '@shapeshiftoss/swap-widget'
\`\`\`

---

## Supported Chains

The widget natively supports all EVM chains, Bitcoin, and Solana. Other chains (Cosmos, Starknet, NEAR, TON, Tron, Sui, etc.) are available via redirect to [app.shapeshift.com](https://app.shapeshift.com).

| Chain | Chain ID | Type |
|-------|----------|------|
| Ethereum | \`eip155:1\` | EVM |
| Arbitrum One | \`eip155:42161\` | EVM |
| Avalanche C-Chain | \`eip155:43114\` | EVM |
| Base | \`eip155:8453\` | EVM |
| Berachain | \`eip155:80094\` | EVM |
| Blast | \`eip155:81457\` | EVM |
| BNB Smart Chain | \`eip155:56\` | EVM |
| BOB | \`eip155:60808\` | EVM |
| Cronos | \`eip155:25\` | EVM |
| Flow EVM | \`eip155:747\` | EVM |
| Gnosis | \`eip155:100\` | EVM |
| Hemi | \`eip155:43111\` | EVM |
| HyperEVM | \`eip155:999\` | EVM |
| Ink | \`eip155:57073\` | EVM |
| Katana | \`eip155:747474\` | EVM |
| Linea | \`eip155:59144\` | EVM |
| Mantle | \`eip155:5000\` | EVM |
| MegaETH | \`eip155:4326\` | EVM |
| Mode | \`eip155:34443\` | EVM |
| Monad | \`eip155:143\` | EVM |
| Optimism | \`eip155:10\` | EVM |
| Plasma | \`eip155:9745\` | EVM |
| Plume | \`eip155:98866\` | EVM |
| Polygon | \`eip155:137\` | EVM |
| Scroll | \`eip155:534352\` | EVM |
| Soneium | \`eip155:1868\` | EVM |
| Sonic | \`eip155:146\` | EVM |
| Story | \`eip155:1514\` | EVM |
| Unichain | \`eip155:130\` | EVM |
| World Chain | \`eip155:480\` | EVM |
| zkSync Era | \`eip155:324\` | EVM |
| Bitcoin | \`bip122:000000000019d6689c085ae165831e93\` | UTXO |
| Solana | \`solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp\` | Solana |

## Supported Swappers (15)

THORChain, MAYAChain, CoW Swap, 0x, Portals, Chainflip, Jupiter, Relay, ButterSwap, Bebop, Arbitrum Bridge, NEAR Intents, Cetus, Sun.io, AVNU.

---

## Architecture Notes

**Internal QueryClient** — The widget manages its own React Query \`QueryClient\`. You do not need to wrap it in a \`QueryClientProvider\`.

**Wagmi Isolation** — In external wallet mode, the widget creates its own isolated read-only wagmi config for balance fetching. It does not interfere with your application's \`WagmiProvider\`.

**AppKit Singleton** — In built-in wallet mode (\`enableWalletConnection=true\`), the widget uses Reown AppKit which is a page-level singleton. Only one AppKit instance can exist per page. If your dApp already uses AppKit or Web3Modal, you **must** use external wallet mode instead.

**CSS Isolation** — All widget styles are prefixed with \`ssw-\` to avoid conflicts with host page styles. Import the stylesheet explicitly:

\`\`\`tsx
import '@shapeshiftoss/swap-widget/style.css'
\`\`\`
`,
  }

  const restApiTag = {
    name: 'REST API Guide',
    description: `Step-by-step guide for integrating swaps via the REST API.

## 1. Get Supported Chains
\`\`\`
GET /v1/chains
\`\`\`

## 2. Get Supported Assets
\`\`\`
GET /v1/assets
\`\`\`

## 3. Get Swap Rates
\`\`\`
GET /v1/swap/rates?sellAssetId=eip155:1/slip44:60&buyAssetId=eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48&sellAmountCryptoBaseUnit=1000000000000000000
X-Affiliate-Address: 0xYourArbitrumAddress (optional)
\`\`\`

## 4. Get Executable Quote
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

## 5. Execute the Swap
Use the returned \`transactionData\` to build and sign a transaction with the user's wallet, then broadcast it to the network.

## 6. Check Swap Status
\`\`\`
GET /v1/swap/status?quoteId=<quoteId>&txHash=0x...
\`\`\`

On the **first call**, include \`txHash\` to bind the transaction to the quote and start tracking. Subsequent polls can omit \`txHash\`.
`,
  }

  doc.tags = [widgetSdkTag, restApiTag, ...(doc.tags ?? [])]

  return doc
}
