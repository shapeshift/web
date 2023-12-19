import type { Csp } from '../../types'

export const csp: Csp = {
  'connect-src': [
    process.env.REACT_APP_UNCHAINED_THORCHAIN_HTTP_URL!,
    process.env.REACT_APP_UNCHAINED_THORCHAIN_WS_URL!,
    process.env.REACT_APP_THORCHAIN_NODE_URL!,
    'https://gitlab.com/thorchain/thornode/-/raw/develop/x/thorchain/aggregators/dex_mainnet_current.go', // Required to check if aggregator is whitelisted for longtail swaps
  ],
}
