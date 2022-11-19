/* eslint-disable @keepkey/logger/no-native-console */
import * as envalid from 'envalid'
import { bool } from 'envalid'
import forEach from 'lodash/forEach'
import memoize from 'lodash/memoize'

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
  REACT_APP_UNCHAINED_BITCOINCASH_HTTP_URL: url(),
  REACT_APP_UNCHAINED_BITCOINCASH_WS_URL: url(),
  REACT_APP_UNCHAINED_DOGECOIN_HTTP_URL: url(),
  REACT_APP_UNCHAINED_DOGECOIN_WS_URL: url(),
  REACT_APP_UNCHAINED_LITECOIN_HTTP_URL: url(),
  REACT_APP_UNCHAINED_LITECOIN_WS_URL: url(),
  REACT_APP_UNCHAINED_COSMOS_HTTP_URL: url(),
  REACT_APP_UNCHAINED_COSMOS_WS_URL: url(),
  REACT_APP_UNCHAINED_OSMOSIS_HTTP_URL: url(),
  REACT_APP_UNCHAINED_OSMOSIS_WS_URL: url(),
  REACT_APP_UNCHAINED_THORCHAIN_HTTP_URL: url(),
  REACT_APP_UNCHAINED_THORCHAIN_WS_URL: url(),
  REACT_APP_THORCHAIN_NODE_URL: url(),
  REACT_APP_ETHEREUM_NODE_URL: url(),
  REACT_APP_ETHEREUM_INFURA_URL: url(),
  REACT_APP_AVALANCHE_NODE_URL: url(),
  REACT_APP_ALCHEMY_POLYGON_URL: url(),
  REACT_APP_KEEPKEY_VERSIONS_URL: url(),
  REACT_APP_DAPP_URL: url({
    default: 'https://pioneers.dev/spec/swagger.json',
  }),
  REACT_APP_WALLET_MIGRATION_URL: url(),
  REACT_APP_PORTIS_DAPP_ID: str({ devDefault: 'fakePortisId' }),
  REACT_APP_JUNOPAY_BASE_API_URL: url(),
  REACT_APP_JUNOPAY_BASE_APP_URL: url(),
  REACT_APP_JUNOPAY_ASSET_LOGO_URL: url(),
  REACT_APP_JUNOPAY_APP_ID: str(),
  REACT_APP_GEM_COINIFY_SUPPORTED_COINS: url(),
  REACT_APP_GEM_WYRE_SUPPORTED_COINS: url(),
  REACT_APP_GEM_ASSET_LOGO: url(),
  REACT_APP_GEM_ENV: str(),
  REACT_APP_GEM_API_KEY: str(),
  REACT_APP_MTPELERIN_ASSETS_API: url(),
  REACT_APP_MTPELERIN_BUY_URL: url(),
  REACT_APP_MTPELERIN_SELL_URL: url(),
  REACT_APP_MTPELERIN_REFERRAL_CODE: str(),
  REACT_APP_FRIENDLY_CAPTCHA_SITE_KEY: str(),
  REACT_APP_ZENDESK_KEY: str({ default: '' }),
  REACT_APP_FEATURE_ZENDESK: bool({ default: false }),
  REACT_APP_FEATURE_YEARN: bool({ default: true }),
  REACT_APP_FEATURE_OSMOSIS: bool({ default: false }),
  REACT_APP_FEATURE_FOX_LP: bool({ default: false }),
  REACT_APP_FEATURE_FOX_FARMING: bool({ default: false }),
  REACT_APP_FEATURE_THORCHAIN: bool({ default: false }),
  REACT_APP_FEATURE_THOR_SWAP: bool({ default: false }),
  REACT_APP_FEATURE_IDLE: bool({ default: false }),
  REACT_APP_FEATURE_COWSWAP: bool({ default: false }),
  REACT_APP_FEATURE_YAT: bool({ default: false }),
  REACT_APP_FEATURE_AXELAR: bool({ default: false }),
  REACT_APP_FEATURE_MULTI_ACCOUNTS: bool({ default: false }),
  REACT_APP_FEATURE_MIGRATION_MESSAGE: bool({ default: false }),
  REACT_APP_FEATURE_SWAPPER_V2: bool({ default: false }),
  REACT_APP_DASHBOARD_BREAKDOWN: bool({ default: false }),
  REACT_APP_FEATURE_WALLET_CONNECT_TO_DAPPS: bool({ default: true }),
  REACT_APP_YAT_NODE_URL: url({ default: 'https://a.y.at' }),
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
  REACT_APP_COWSWAP_HTTP_URL: url({
    default: 'https://api.cow.fi/mainnet/api',
  }),
  REACT_APP_COSMOS_NODE_URL: url({
    default:
      'https://osmosis-1--lcd--full.datahub.figment.io/apikey/14c056a2415b6e0d2b9f55985214f3f1/',
  }),
  REACT_APP_OSMOSIS_NODE_URL: url({
    default:
      'https://cosmoshub-4--lcd--full.datahub.figment.io/apikey/14c056a2415b6e0d2b9f55985214f3f1/',
  }),
  REACT_APP_FEATURE_PENDO: bool({ default: false }),
  REACT_APP_PENDO_API_KEY: envalid.str({ default: '67c2f326-a6c2-4aa2-4559-08a53b679e93' }),
  REACT_APP_PENDO_CONSENT_VERSION: envalid.str({ default: 'v1' }),
  REACT_APP_PENDO_SUB_ID: envalid.str({ default: '6047664892149760' }),
  REACT_APP_PENDO_UNSAFE_DESIGNER_MODE: envalid.bool({ default: false }),
  REACT_APP_PENDO_VISITOR_ID_PREFIX: envalid.str({ default: 'test_visitor' }),
  REACT_APP_ONRAMPER_WIDGET_URL: url(),
  REACT_APP_ONRAMPER_API_URL: url(),
  REACT_APP_ONRAMPER_API_KEY: str(),
  REACT_APP_KEEPKEY_UPDATER_RELEASE_PAGE: url({
    default: 'https://github.com/keepkey/keepkey-updater/releases/latest',
  }),
  REACT_APP_KEEPKEY_UPDATER_BASE_URL: url({
    default: 'https://github.com/keepkey/keepkey-updater/releases/download/v2.1.4/',
  }),
  REACT_APP_ETHERSCAN_API_KEY: str({ default: 'XT8BI6VDYUGD9675X861ATHZNK3AN6HRMF' }),
}

function reporter<T>({ errors }: envalid.ReporterOptions<T>) {
  forEach(errors, (err, key) => {
    if (!err) return
    err.message = key
    // Can't use logger in src/config in tests
    // eslint-disable-next-line no-console
    console.error(err, key, 'Invalid Config')
  })
}

export const getConfig = memoize(() =>
  Object.freeze({ ...cleanEnv(env, validators, { reporter }) }),
)
