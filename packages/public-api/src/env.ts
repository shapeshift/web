import { z } from 'zod'

const url = z.string().url()
const flag = z.enum(['true', 'false']).transform(v => v === 'true')

const envSchema = z.object({
  // Server
  PORT: z.string().regex(/^\d+$/, 'PORT must be numeric').default('3005'),
  NODE_ENV: z.string().default('development'),

  // Swap service
  SWAP_SERVICE_BASE_URL: url,

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

  // Node URLs
  THORCHAIN_NODE_URL: url,
  MAYACHAIN_NODE_URL: url,
  TRON_NODE_URL: url,
  SUI_NODE_URL: url,

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

  // Swapper API keys (optional)
  CHAINFLIP_API_KEY: z.string().default(''),
  BEBOP_API_KEY: z.string().default(''),
  NEAR_INTENTS_API_KEY: z.string().default(''),
  BOB_GATEWAY_AFFILIATE_ID: z.string().default(''),
  TENDERLY_API_KEY: z.string().default(''),
  TENDERLY_ACCOUNT_SLUG: z.string().default(''),
  TENDERLY_PROJECT_SLUG: z.string().default(''),
  ACROSS_INTEGRATOR_ID: z.string().default(''),

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
