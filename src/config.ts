import { HistoryTimeframe } from '@shapeshiftoss/types'
import * as envalid from 'envalid'
import { bool } from 'envalid'
import forEach from 'lodash/forEach'
import memoize from 'lodash/memoize'
import merge from 'lodash/merge'

import env from './env'

const { cleanEnv, str, url } = envalid

// add validators for each .env variable
// note env vars must be prefixed with REACT_APP_
const validators = {
  REACT_APP_LOG_LEVEL: str({ default: 'info' }),
  REACT_APP_UNCHAINED_ETHEREUM_HTTP_URL: url(),
  REACT_APP_UNCHAINED_ETHEREUM_WS_URL: url(),
  REACT_APP_UNCHAINED_AVALANCHE_HTTP_URL: url(),
  REACT_APP_UNCHAINED_AVALANCHE_WS_URL: url(),
  REACT_APP_UNCHAINED_BITCOIN_HTTP_URL: url(),
  REACT_APP_UNCHAINED_BITCOIN_WS_URL: url(),
  REACT_APP_UNCHAINED_DOGECOIN_HTTP_URL: url(),
  REACT_APP_UNCHAINED_DOGECOIN_WS_URL: url(),
  REACT_APP_UNCHAINED_COSMOS_HTTP_URL: url(),
  REACT_APP_UNCHAINED_COSMOS_WS_URL: url(),
  REACT_APP_UNCHAINED_OSMOSIS_HTTP_URL: url(),
  REACT_APP_UNCHAINED_OSMOSIS_WS_URL: url(),
  REACT_APP_ETHEREUM_NODE_URL: url(),
  REACT_APP_AVALANCHE_NODE_URL: url(),
  REACT_APP_ALCHEMY_POLYGON_URL: url(),
  REACT_APP_KEEPKEY_VERSIONS_URL: url(),
  REACT_APP_WALLET_MIGRATION_URL: url(),
  REACT_APP_PORTIS_DAPP_ID: str({ devDefault: 'fakePortisId' }),
  REACT_APP_COINBASE_SUPPORTED_COINS: url(),
  REACT_APP_COINBASE_PAY_APP_ID: str({ devDefault: '1dbd2a0b94' }), // Default is coinbase Testing App.
  REACT_APP_JUNOPAY_BASE_API_URL: url(),
  REACT_APP_JUNOPAY_BASE_APP_URL: url(),
  REACT_APP_JUNOPAY_ASSET_LOGO_URL: url(),
  REACT_APP_JUNOPAY_APP_ID: str(),
  REACT_APP_GEM_COINIFY_SUPPORTED_COINS: url(),
  REACT_APP_GEM_WYRE_SUPPORTED_COINS: url(),
  REACT_APP_GEM_ASSET_LOGO: url(),
  REACT_APP_GEM_ENV: str(),
  REACT_APP_GEM_API_KEY: str(),
  REACT_APP_FRIENDLY_CAPTCHA_SITE_KEY: str(),
  REACT_APP_FEATURE_YEARN: bool({ default: true }),
  REACT_APP_FEATURE_OSMOSIS: bool({ default: false }),
  REACT_APP_FEATURE_WALLETCONNECT_WALLET: bool({ default: false }),
  REACT_APP_FEATURE_AVALANCHE: bool({ default: false }),
  REACT_APP_FEATURE_THOR: bool({ default: false }),
  REACT_APP_FEATURE_DOGECOIN: bool({ default: false }),
  REACT_APP_FEATURE_COWSWAP: bool({ default: false }),
  REACT_APP_FEATURE_COINBASE_RAMP: bool({ default: false }),
  REACT_APP_FEATURE_JUNOPAY: bool({ default: false }),
  REACT_APP_TOKEMAK_STATS_URL: url({ default: 'https://stats.tokemaklabs.com/' }),
  REACT_APP_COINGECKO_API_KEY: str({ default: '' }), // not required, we can fall back to the free tier
  REACT_APP_LOCAL_IP: str({ default: '192.168.1.222' }),
  REACT_APP_BOARDROOM_API_BASE_URL: url({
    default: 'https://api.boardroom.info/v1/protocols/shapeshift/',
  }),
  REACT_APP_BOARDROOM_APP_BASE_URL: url({
    default: 'https://boardroom.io/shapeshift/',
  }),
  REACT_APP_MIDGARD_URL: url({
    default: 'https://midgard.thorchain.info/v2',
  }),
  REACT_APP_COSMOS_NODE_URL: url({
    default: 'https://rest.cosmos.directory/cosmoshub/',
  }),
  REACT_APP_OSMOSIS_NODE_URL: url({
    default: 'https://rest.cosmos.directory/osmosis/',
  }),
  REACT_APP_FEATURE_PENDO: bool({ default: false }),
  REACT_APP_PENDO_API_KEY: envalid.str({ default: '67c2f326-a6c2-4aa2-4559-08a53b679e93' }),
  REACT_APP_PENDO_CONSENT_VERSION: envalid.str({ default: 'v1' }),
  REACT_APP_PENDO_SUB_ID: envalid.str({ default: '6047664892149760' }),
  REACT_APP_PENDO_UNSAFE_DESIGNER_MODE: envalid.bool({ default: false }),
  REACT_APP_PENDO_VISITOR_ID_PREFIX: envalid.str({ default: 'test_visitor' }),
}

// @TODO: We may want to move internal constants out of config and into a separate file
const constants = {
  // used by AssetChart, Portfolio, and this file to prefetch price history
  DEFAULT_HISTORY_TIMEFRAME: HistoryTimeframe.MONTH,
} as const

function reporter<T>({ errors }: envalid.ReporterOptions<T>) {
  forEach(errors, (err, key) => {
    if (!err) return
    err.message = key
    console.error(err, key, 'Invalid Config')
  })
}

export const getConfig = memoize(() =>
  Object.freeze(merge({ ...cleanEnv(env, validators, { reporter }) }, constants)),
)
