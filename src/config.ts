import * as envalid from 'envalid'
import { bool } from 'envalid'
import forEach from 'lodash/forEach'
import memoize from 'lodash/memoize'

import env from './env'

const { cleanEnv, str, url, num } = envalid

// add validators for each .env variable
// note env vars must be prefixed with REACT_APP_
const validators = {
  REACT_APP_LOG_LEVEL: str({ default: 'info' }),
  REACT_APP_REDUX_WINDOW: bool({ default: false }),
  REACT_APP_UNCHAINED_ETHEREUM_HTTP_URL: url(),
  REACT_APP_UNCHAINED_ETHEREUM_WS_URL: url(),
  REACT_APP_UNCHAINED_AVALANCHE_HTTP_URL: url(),
  REACT_APP_UNCHAINED_AVALANCHE_WS_URL: url(),
  REACT_APP_UNCHAINED_OPTIMISM_HTTP_URL: url(),
  REACT_APP_UNCHAINED_OPTIMISM_WS_URL: url(),
  REACT_APP_UNCHAINED_BNBSMARTCHAIN_HTTP_URL: url(),
  REACT_APP_UNCHAINED_BNBSMARTCHAIN_WS_URL: url(),
  REACT_APP_UNCHAINED_POLYGON_HTTP_URL: url(),
  REACT_APP_UNCHAINED_POLYGON_WS_URL: url(),
  REACT_APP_UNCHAINED_GNOSIS_HTTP_URL: url(),
  REACT_APP_UNCHAINED_GNOSIS_WS_URL: url(),
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
  REACT_APP_OPTIMISM_NODE_URL: url(),
  REACT_APP_BNBSMARTCHAIN_NODE_URL: url(),
  REACT_APP_POLYGON_NODE_URL: url(),
  REACT_APP_GNOSIS_NODE_URL: url(),
  REACT_APP_ALCHEMY_POLYGON_URL: url(),
  REACT_APP_KEEPKEY_VERSIONS_URL: url(),
  REACT_APP_WALLET_MIGRATION_URL: url(),
  REACT_APP_JUNOPAY_BASE_API_URL: url(),
  REACT_APP_JUNOPAY_BASE_APP_URL: url(),
  REACT_APP_JUNOPAY_ASSET_LOGO_URL: url(),
  REACT_APP_JUNOPAY_APP_ID: str(),
  REACT_APP_GEM_COINIFY_SUPPORTED_COINS: url(),
  REACT_APP_GEM_WYRE_SUPPORTED_COINS: url(),
  REACT_APP_GEM_ENV: str(),
  REACT_APP_GEM_API_KEY: str(),
  REACT_APP_MTPELERIN_ASSETS_API: url(),
  REACT_APP_MTPELERIN_BUY_URL: url(),
  REACT_APP_MTPELERIN_SELL_URL: url(),
  REACT_APP_MTPELERIN_REFERRAL_CODE: str(),
  REACT_APP_FRIENDLY_CAPTCHA_SITE_KEY: str(),
  REACT_APP_FEATURE_DASHBOARD_TABS: bool({ default: false }),
  REACT_APP_ZERION_API_KEY: str(),
  REACT_APP_FEATURE_DEFI_DASHBOARD: bool({ default: false }),
  REACT_APP_ZAPPER_API_KEY: str(),
  REACT_APP_COVALENT_API_KEY: str(),
  REACT_APP_FEATURE_LIFI_SWAP: bool({ default: false }),
  REACT_APP_FEATURE_COWSWAP: bool({ default: false }),
  REACT_APP_FEATURE_COWSWAP_GNOSIS: bool({ default: false }),
  REACT_APP_FEATURE_JAYPEGZ: bool({ default: false }),
  REACT_APP_FEATURE_OSMOSIS_SEND: bool({ default: false }),
  REACT_APP_FEATURE_OSMOSIS_LP: bool({ default: false }),
  REACT_APP_FEATURE_OSMOSIS_LP_ADDITIONAL_POOLS: bool({ default: false }),
  REACT_APP_FEATURE_OSMOSIS_STAKING: bool({ default: false }),
  REACT_APP_FEATURE_OSMOSIS_SWAP: bool({ default: false }),
  REACT_APP_FEATURE_OPTIMISM: bool({ default: false }),
  REACT_APP_FEATURE_BNBSMARTCHAIN: bool({ default: false }),
  REACT_APP_FEATURE_POLYGON: bool({ default: false }),
  REACT_APP_FEATURE_GNOSIS: bool({ default: false }),
  REACT_APP_FEATURE_ZRX_SWAP: bool({ default: false }),
  REACT_APP_FEATURE_THOR_SWAP: bool({ default: false }),
  REACT_APP_FEATURE_IDLE: bool({ default: false }),
  REACT_APP_FEATURE_YAT: bool({ default: false }),
  REACT_APP_FEATURE_AXELAR: bool({ default: false }),
  REACT_APP_FEATURE_SAVERS_VAULTS: bool({ default: false }),
  REACT_APP_FEATURE_WALLET_CONNECT_TO_DAPPS: bool({ default: false }),
  REACT_APP_FEATURE_WALLET_CONNECT_TO_DAPPS_V2: bool({ default: false }),
  REACT_APP_FEATURE_MULTI_HOP_TRADES: bool({ default: false }),
  REACT_APP_FEATURE_COINBASE_WALLET: bool({ default: false }),
  REACT_APP_FEATURE_WALLET_CONNECT_V2: bool({ default: false }),
  REACT_APP_WALLET_CONNECT_PROJECT_ID: str({ default: '' }),
  REACT_APP_WALLET_CONNECT_RELAY_URL: str({ default: 'wss://relay.walletconnect.com' }),
  REACT_APP_YAT_NODE_URL: url({ default: 'https://a.y.at' }),
  REACT_APP_TOKEMAK_STATS_URL: url({ default: 'https://stats.tokemaklabs.com/' }),
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
  REACT_APP_COWSWAP_BASE_URL: url({
    default: 'https://api.cow.fi',
  }),
  REACT_APP_COSMOS_NODE_URL: url({
    default: 'https://dev-daemon.osmosis.shapeshift.com',
  }),
  REACT_APP_OSMOSIS_NODE_URL: url({
    default: 'https://dev-daemon.cosmos.shapeshift.com',
  }),
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
  REACT_APP_WHEREVER_PARTNER_KEY: str({ default: 'REPLACE_WHEN_MADE_DELEGATE' }),
  REACT_APP_FEATURE_WHEREVER: bool({ default: false }),
  REACT_APP_OSMOSIS_LCD_BASE_URL: url({
    default: 'https://daemon.osmosis.shapeshift.com/',
  }),
  REACT_APP_OSMOSIS_IMPERATOR_BASE_URL: url({
    default: 'https://api-osmosis.imperator.co/',
  }),
  REACT_APP_OSMOSIS_ALLOW_LOW_LIQUIDITY_POOLS: bool({ default: false }),
  REACT_APP_OSMOSIS_POOL_PAGINATION_LIMIT: num({
    default: 1000,
  }),
  REACT_APP_FEATURE_YEARN: bool({ default: false }),
  REACT_APP_FEATURE_ARKEO_AIRDROP: bool({ default: false }),
  REACT_APP_MIXPANEL_TOKEN: str(),
  REACT_APP_FEATURE_TRADE_RATES: bool({ default: false }),
  REACT_APP_SNAPSHOT_BASE_URL: url({
    default: 'https://snapshot.org/#/shapeshiftdao.eth',
  }),
  REACT_APP_FEATURE_MIXPANEL: bool({ default: false }),
  REACT_APP_FEATURE_FOX_BOND_CTA: bool({ default: false }),
  REACT_APP_FEATURE_DYNAMIC_LP_ASSETS: bool({ default: false }),
  REACT_APP_FEATURE_READ_ONLY_ASSETS: bool({ default: false }),
  REACT_APP_FEATURE_ONE_INCH: bool({ default: false }),
  REACT_APP_ONE_INCH_API_URL: url({
    default: 'https://api.1inch.io/v5.0',
  }),
  REACT_APP_FEATURE_COVALENT_JAYPEGS: bool({ default: false }),
  REACT_APP_ALCHEMY_POLYGON_JAYPEGS_API_KEY: str(),
  REACT_APP_ALCHEMY_OPTIMISM_JAYPEGS_API_KEY: str(),
  REACT_APP_ALCHEMY_ETHEREUM_JAYPEGS_API_KEY: str(),
  REACT_APP_ZRX_API_KEY: str(),
  REACT_APP_CHATWOOT_TOKEN: str(),
  REACT_APP_CHATWOOT_URL: str(),
  REACT_APP_FEATURE_CHATWOOT: bool({ default: false }),
  REACT_APP_ADVANCED_SLIPPAGE: bool({ default: false }),
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
