import { z } from 'zod'

const url = z.string().url()
const flag = z.enum(['true', 'false']).transform(v => v === 'true')

const envSchema = z.object({
  // Server
  PORT: z.string().regex(/^\d+$/, 'PORT must be numeric').default('3005'),
  NODE_ENV: z.string().default('development'),

  // Swap service
  SWAP_SERVICE_BASE_URL: url,
  SWAP_SERVICE_API_KEY: z.string().min(1),

  // Unchained URLs
  UNCHAINED_ETHEREUM_HTTP_URL: url,
  UNCHAINED_BITCOIN_HTTP_URL: url,
  UNCHAINED_THORCHAIN_HTTP_URL: url,
  UNCHAINED_MAYACHAIN_HTTP_URL: url,
  UNCHAINED_COSMOS_HTTP_URL: url,
  UNCHAINED_AVALANCHE_HTTP_URL: url,
  UNCHAINED_BNBSMARTCHAIN_HTTP_URL: url,
  UNCHAINED_BASE_HTTP_URL: url,
  UNCHAINED_ARBITRUM_HTTP_URL: url,
  UNCHAINED_OPTIMISM_HTTP_URL: url,
  UNCHAINED_POLYGON_HTTP_URL: url,
  UNCHAINED_GNOSIS_HTTP_URL: url,
  UNCHAINED_DOGECOIN_HTTP_URL: url,
  UNCHAINED_LITECOIN_HTTP_URL: url,
  UNCHAINED_BITCOINCASH_HTTP_URL: url,
  UNCHAINED_ZCASH_HTTP_URL: url,
  UNCHAINED_SOLANA_HTTP_URL: url,
  UNCHAINED_THORCHAIN_V1_HTTP_URL: url,

  // First-class EVM node URLs — passed to chain adapter constructors and
  // consumed by @shapeshiftoss/contracts via process.env.VITE_*_NODE_URL.
  VITE_ETHEREUM_NODE_URL: url,
  VITE_BNBSMARTCHAIN_NODE_URL: url,
  VITE_AVALANCHE_NODE_URL: url,
  VITE_ARBITRUM_NODE_URL: url,
  VITE_OPTIMISM_NODE_URL: url,
  VITE_GNOSIS_NODE_URL: url,
  VITE_POLYGON_NODE_URL: url,
  VITE_BASE_NODE_URL: url,

  // Second-class EVM node URLs — same VITE_*_NODE_URL contract as first-class.
  VITE_HYPEREVM_NODE_URL: url,
  VITE_KATANA_NODE_URL: url,
  VITE_MEGAETH_NODE_URL: url,
  VITE_MONAD_NODE_URL: url,
  VITE_PLASMA_NODE_URL: url,

  // Node URLs
  THORCHAIN_NODE_URL: url,
  MAYACHAIN_NODE_URL: url,
  TRON_NODE_URL: url,
  SUI_NODE_URL: url,
  SOLANA_NODE_URL: url,
  TON_NODE_URL: url,
  STARKNET_NODE_URL: url,
  NEAR_NODE_URL: url,
  NEAR_NODE_URL_FALLBACK_1: z.union([url, z.literal('')]).default(''),
  NEAR_NODE_URL_FALLBACK_2: z.union([url, z.literal('')]).default(''),
  FASTNEAR_API_URL: url,

  // Midgard URLs
  THORCHAIN_MIDGARD_URL: url,
  MAYACHAIN_MIDGARD_URL: url,

  // Swapper API URLs
  COWSWAP_BASE_URL: url,
  PORTALS_BASE_URL: url,
  ZRX_BASE_URL: url,
  RELAY_API_URL: url,
  ACROSS_API_URL: url,
  DEBRIDGE_API_URL: url,
  CHAINFLIP_API_URL: url,

  // Swapper API keys
  ACROSS_INTEGRATOR_ID: z.string().default(''),
  ACROSS_API_KEY: z.string().default(''),
  BEBOP_API_KEY: z.string().min(1),
  BOB_GATEWAY_API_KEY: z.string().default(''),
  CHAINFLIP_API_KEY: z.string().min(1),
  NEAR_INTENTS_API_KEY: z.string().min(1),
  RELAY_API_KEY: z.string().default(''),
  TRON_GRID_API_KEY: z.string().default(''),

  // Feature flags
  FEATURE_THORCHAINSWAP_LONGTAIL: flag,
  FEATURE_THORCHAINSWAP_L1_TO_LONGTAIL: flag,
  FEATURE_CHAINFLIP_SWAP_DCA: flag,

  // Affiliate
  DEFAULT_AFFILIATE_BPS: z.string().regex(/^\d+$/, 'DEFAULT_AFFILIATE_BPS must be numeric'),

  // Rate limiting
  RATE_LIMIT_GLOBAL_MAX: z.coerce.number().int().min(1),
  RATE_LIMIT_DATA_MAX: z.coerce.number().int().min(1),
  RATE_LIMIT_SWAP_RATES_MAX: z.coerce.number().int().min(1),
  RATE_LIMIT_SWAP_QUOTE_MAX: z.coerce.number().int().min(1),
  RATE_LIMIT_SWAP_STATUS_MAX: z.coerce.number().int().min(1),
  RATE_LIMIT_AFFILIATE_STATS_MAX: z.coerce.number().int().min(1),
  RATE_LIMIT_AFFILIATE_MUTATION_MAX: z.coerce.number().int().min(1),
})

const result = envSchema.safeParse(process.env)

if (!result.success) {
  console.error('Missing or invalid environment variables:')
  for (const issue of result.error.issues) {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`)
  }
  process.exit(1)
}

export const env = result.data
