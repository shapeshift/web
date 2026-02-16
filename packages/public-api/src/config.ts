import type { SwapperConfig } from '@shapeshiftoss/swapper'

// Server-side config that mirrors the web app's config but from environment variables
export const getServerConfig = (): SwapperConfig => ({
  VITE_UNCHAINED_THORCHAIN_HTTP_URL:
    process.env.UNCHAINED_THORCHAIN_HTTP_URL || 'https://api.thorchain.shapeshift.com',
  VITE_UNCHAINED_MAYACHAIN_HTTP_URL:
    process.env.UNCHAINED_MAYACHAIN_HTTP_URL || 'https://api.mayachain.shapeshift.com',
  VITE_UNCHAINED_COSMOS_HTTP_URL:
    process.env.UNCHAINED_COSMOS_HTTP_URL || 'https://api.cosmos.shapeshift.com',
  VITE_THORCHAIN_NODE_URL: process.env.THORCHAIN_NODE_URL || 'https://thornode.ninerealms.com',
  VITE_MAYACHAIN_NODE_URL: process.env.MAYACHAIN_NODE_URL || 'https://tendermint.mayachain.info',
  VITE_TRON_NODE_URL: process.env.TRON_NODE_URL || 'https://api.trongrid.io',
  VITE_FEATURE_THORCHAINSWAP_LONGTAIL: process.env.FEATURE_THORCHAINSWAP_LONGTAIL === 'true',
  VITE_FEATURE_THORCHAINSWAP_L1_TO_LONGTAIL:
    process.env.FEATURE_THORCHAINSWAP_L1_TO_LONGTAIL === 'true',
  VITE_THORCHAIN_MIDGARD_URL:
    process.env.THORCHAIN_MIDGARD_URL || 'https://midgard.ninerealms.com/v2',
  VITE_MAYACHAIN_MIDGARD_URL:
    process.env.MAYACHAIN_MIDGARD_URL || 'https://midgard.mayachain.info/v2',
  VITE_UNCHAINED_BITCOIN_HTTP_URL:
    process.env.UNCHAINED_BITCOIN_HTTP_URL || 'https://api.bitcoin.shapeshift.com',
  VITE_UNCHAINED_DOGECOIN_HTTP_URL:
    process.env.UNCHAINED_DOGECOIN_HTTP_URL || 'https://api.dogecoin.shapeshift.com',
  VITE_UNCHAINED_LITECOIN_HTTP_URL:
    process.env.UNCHAINED_LITECOIN_HTTP_URL || 'https://api.litecoin.shapeshift.com',
  VITE_UNCHAINED_BITCOINCASH_HTTP_URL:
    process.env.UNCHAINED_BITCOINCASH_HTTP_URL || 'https://api.bitcoincash.shapeshift.com',
  VITE_UNCHAINED_ETHEREUM_HTTP_URL:
    process.env.UNCHAINED_ETHEREUM_HTTP_URL || 'https://api.ethereum.shapeshift.com',
  VITE_UNCHAINED_AVALANCHE_HTTP_URL:
    process.env.UNCHAINED_AVALANCHE_HTTP_URL || 'https://api.avalanche.shapeshift.com',
  VITE_UNCHAINED_BNBSMARTCHAIN_HTTP_URL:
    process.env.UNCHAINED_BNBSMARTCHAIN_HTTP_URL || 'https://api.bnbsmartchain.shapeshift.com',
  VITE_UNCHAINED_BASE_HTTP_URL:
    process.env.UNCHAINED_BASE_HTTP_URL || 'https://api.base.shapeshift.com',
  VITE_COWSWAP_BASE_URL: process.env.COWSWAP_BASE_URL || 'https://api.cow.fi',
  VITE_PORTALS_BASE_URL: process.env.PORTALS_BASE_URL || 'https://api.portals.fi',
  VITE_ZRX_BASE_URL: process.env.ZRX_BASE_URL || 'https://api.proxy.shapeshift.com/api/v1/zrx/',
  VITE_CHAINFLIP_API_KEY: process.env.CHAINFLIP_API_KEY || '',
  VITE_CHAINFLIP_API_URL: process.env.CHAINFLIP_API_URL || 'https://chainflip-broker.io',
  VITE_FEATURE_CHAINFLIP_SWAP_DCA: process.env.FEATURE_CHAINFLIP_SWAP_DCA === 'true',
  VITE_JUPITER_API_URL: process.env.JUPITER_API_URL || 'https://quote-api.jup.ag/v6',
  VITE_RELAY_API_URL: process.env.RELAY_API_URL || 'https://api.relay.link',
  VITE_BEBOP_API_KEY: process.env.BEBOP_API_KEY || '',
  VITE_NEAR_INTENTS_API_KEY: process.env.NEAR_INTENTS_API_KEY || '',
  VITE_TENDERLY_API_KEY: process.env.TENDERLY_API_KEY || '',
  VITE_TENDERLY_ACCOUNT_SLUG: process.env.TENDERLY_ACCOUNT_SLUG || '',
  VITE_TENDERLY_PROJECT_SLUG: process.env.TENDERLY_PROJECT_SLUG || '',
  VITE_SUI_NODE_URL: process.env.SUI_NODE_URL || 'https://fullnode.mainnet.sui.io',
  VITE_ACROSS_API_URL: process.env.ACROSS_API_URL || 'https://app.across.to/api',
  VITE_ACROSS_INTEGRATOR_ID: process.env.ACROSS_INTEGRATOR_ID || '',
})

// Default affiliate fee in basis points
export const DEFAULT_AFFILIATE_BPS = '55'

// API server config
export const API_PORT = parseInt(process.env.PORT || '3001', 10)
export const API_HOST = process.env.HOST || '0.0.0.0'

// Static API keys for testing (in production these would come from a database)
export const STATIC_API_KEYS: Record<string, { name: string; feeSharePercentage: number }> = {
  'test-api-key-123': { name: 'Test Partner', feeSharePercentage: 50 },
}
