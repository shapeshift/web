import { JUPITER_API_URL } from 'constants/urls'
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
  REACT_APP_UNCHAINED_ARBITRUM_HTTP_URL: url(),
  REACT_APP_UNCHAINED_ARBITRUM_WS_URL: url(),
  REACT_APP_UNCHAINED_ARBITRUM_NOVA_HTTP_URL: url(),
  REACT_APP_UNCHAINED_ARBITRUM_NOVA_WS_URL: url(),
  REACT_APP_UNCHAINED_BASE_HTTP_URL: url(),
  REACT_APP_UNCHAINED_BASE_WS_URL: url(),
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
  REACT_APP_UNCHAINED_THORCHAIN_HTTP_URL: url(),
  REACT_APP_UNCHAINED_THORCHAIN_WS_URL: url(),
  REACT_APP_UNCHAINED_THORCHAIN_V1_HTTP_URL: url(),
  REACT_APP_UNCHAINED_SOLANA_HTTP_URL: url(),
  REACT_APP_UNCHAINED_SOLANA_WS_URL: url(),
  REACT_APP_THORCHAIN_NODE_URL: url(),
  REACT_APP_ETHEREUM_NODE_URL: url(),
  REACT_APP_AVALANCHE_NODE_URL: url(),
  REACT_APP_OPTIMISM_NODE_URL: url(),
  REACT_APP_BNBSMARTCHAIN_NODE_URL: url(),
  REACT_APP_POLYGON_NODE_URL: url(),
  REACT_APP_GNOSIS_NODE_URL: url(),
  REACT_APP_ARBITRUM_NODE_URL: url(),
  REACT_APP_ARBITRUM_NOVA_NODE_URL: url(),
  REACT_APP_BASE_NODE_URL: url(),
  REACT_APP_SOLANA_NODE_URL: url(),
  REACT_APP_ALCHEMY_POLYGON_URL: url(),
  REACT_APP_KEEPKEY_VERSIONS_URL: url(),
  REACT_APP_WALLET_MIGRATION_URL: url(),
  REACT_APP_EXCHANGERATEHOST_BASE_URL: url(),
  REACT_APP_EXCHANGERATEHOST_API_KEY: str(),
  REACT_APP_MTPELERIN_ASSETS_API: url(),
  REACT_APP_MTPELERIN_BUY_URL: url(),
  REACT_APP_MTPELERIN_SELL_URL: url(),
  REACT_APP_MTPELERIN_REFERRAL_CODE: str(),
  REACT_APP_MTPELERIN_INTEGRATION_KEY: str(),
  REACT_APP_FRIENDLY_CAPTCHA_SITE_KEY: str(),
  REACT_APP_FEATURE_LIFI_SWAP: bool({ default: false }),
  REACT_APP_FEATURE_COWSWAP: bool({ default: false }),
  REACT_APP_FEATURE_JAYPEGZ: bool({ default: false }),
  REACT_APP_FEATURE_OPTIMISM: bool({ default: false }),
  REACT_APP_FEATURE_BNBSMARTCHAIN: bool({ default: false }),
  REACT_APP_FEATURE_POLYGON: bool({ default: false }),
  REACT_APP_FEATURE_GNOSIS: bool({ default: false }),
  REACT_APP_FEATURE_ARBITRUM: bool({ default: false }),
  REACT_APP_FEATURE_ARBITRUM_NOVA: bool({ default: false }),
  REACT_APP_FEATURE_SOLANA: bool({ default: false }),
  REACT_APP_FEATURE_BASE: bool({ default: false }),
  REACT_APP_FEATURE_ZRX_SWAP: bool({ default: false }),
  REACT_APP_FEATURE_THOR_SWAP: bool({ default: false }),
  REACT_APP_FEATURE_THOR_SWAP_STREAMING_SWAPS: bool({ default: false }),
  REACT_APP_FEATURE_SAVERS_VAULTS: bool({ default: false }),
  REACT_APP_FEATURE_SAVERS_VAULTS_DEPOSIT: bool({ default: false }),
  REACT_APP_FEATURE_SAVERS_VAULTS_WITHDRAW: bool({ default: false }),
  REACT_APP_FEATURE_CUSTOM_TOKEN_IMPORT: bool({ default: false }),
  // A flag encapsulating all WalletConnect to dApps - v1 and v2
  REACT_APP_FEATURE_WALLET_CONNECT_TO_DAPPS: bool({ default: false }),
  REACT_APP_FEATURE_WALLET_CONNECT_TO_DAPPS_V2: bool({ default: false }),
  REACT_APP_FEATURE_LEDGER_WALLET: bool({ default: false }),
  REACT_APP_FEATURE_WALLET_CONNECT_V2: bool({ default: false }),
  REACT_APP_WALLET_CONNECT_TO_DAPPS_PROJECT_ID: str({ default: '' }),
  REACT_APP_WALLET_CONNECT_WALLET_PROJECT_ID: str({ default: '' }),
  REACT_APP_WALLET_CONNECT_RELAY_URL: str({ default: 'wss://relay.walletconnect.com' }),
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
  REACT_APP_MIXPANEL_TOKEN: str(),
  REACT_APP_SNAPSHOT_BASE_URL: url({
    default: 'https://snapshot.org/#/shapeshiftdao.eth',
  }),
  REACT_APP_FEATURE_MIXPANEL: bool({ default: false }),
  REACT_APP_FEATURE_DYNAMIC_LP_ASSETS: bool({ default: false }),
  REACT_APP_FEATURE_READ_ONLY_ASSETS: bool({ default: false }),
  REACT_APP_FEATURE_ARBITRUM_BRIDGE: bool({ default: false }),
  REACT_APP_FEATURE_PORTALS_SWAPPER: bool({ default: false }),
  REACT_APP_FEATURE_ONE_INCH: bool({ default: false }),
  REACT_APP_SENTRY_DSN_URL: url(),
  REACT_APP_ALCHEMY_API_KEY: str(),
  REACT_APP_ALCHEMY_SOLANA_BASE_URL: url(),
  REACT_APP_PORTALS_API_KEY: str(),
  REACT_APP_ALCHEMY_ETHEREUM_JAYPEGS_BASE_URL: url(),
  REACT_APP_ALCHEMY_POLYGON_JAYPEGS_BASE_URL: url(),
  REACT_APP_ALCHEMY_OPTIMISM_JAYPEGS_BASE_URL: url(),
  REACT_APP_ALCHEMY_ARBITRUM_JAYPEGS_BASE_URL: url(),
  REACT_APP_ALCHEMY_BASE_JAYPEGS_BASE_URL: url(),
  REACT_APP_CHATWOOT_TOKEN: str(),
  REACT_APP_CHATWOOT_URL: str(),
  REACT_APP_FEATURE_CHATWOOT: bool({ default: false }),
  REACT_APP_FEATURE_ADVANCED_SLIPPAGE: bool({ default: false }),
  REACT_APP_EXPERIMENTAL_CUSTOM_SEND_NONCE: bool({ default: false }),
  REACT_APP_SNAP_ID: str(),
  REACT_APP_SNAP_VERSION: str(),
  REACT_APP_FEATURE_THORCHAIN_LENDING: bool({ default: false }),
  REACT_APP_FEATURE_THORCHAIN_LENDING_BORROW: bool({ default: false }),
  REACT_APP_FEATURE_THORCHAIN_LENDING_REPAY: bool({ default: false }),
  REACT_APP_FEATURE_THORCHAIN_LP: bool({ default: false }),
  REACT_APP_FEATURE_THORCHAIN_LP_DEPOSIT: bool({ default: false }),
  REACT_APP_FEATURE_THORCHAIN_LP_WITHDRAW: bool({ default: false }),
  REACT_APP_FEATURE_THORCHAINSWAP_LONGTAIL: bool({ default: false }),
  REACT_APP_FEATURE_THORCHAINSWAP_L1_TO_LONGTAIL: bool({ default: false }),
  REACT_APP_FEATURE_ACCOUNT_MANAGEMENT: bool({ default: false }),
  REACT_APP_FEATURE_ACCOUNT_MANAGEMENT_LEDGER: bool({ default: false }),
  REACT_APP_FEATURE_RFOX: bool({ default: false }),
  REACT_APP_FEATURE_RFOX_LP: bool({ default: false }),
  REACT_APP_FEATURE_ARBITRUM_BRIDGE_CLAIMS: bool({ default: false }),
  REACT_APP_FEATURE_USDT_APPROVAL_RESET: bool({ default: false }),
  REACT_APP_FEATURE_RUNEPOOL: bool({ default: false }),
  REACT_APP_FEATURE_RUNEPOOL_DEPOSIT: bool({ default: false }),
  REACT_APP_FEATURE_RUNEPOOL_WITHDRAW: bool({ default: false }),
  REACT_APP_FEATURE_MARKETS: bool({ default: false }),
  REACT_APP_PORTALS_BASE_URL: url(),
  REACT_APP_ZERION_BASE_URL: url(),
  REACT_APP_FEATURE_PHANTOM_WALLET: bool({ default: false }),
  REACT_APP_FEATURE_FOX_PAGE: bool({ default: false }),
  REACT_APP_FEATURE_FOX_PAGE_RFOX: bool({ default: false }),
  REACT_APP_FEATURE_FOX_PAGE_FOX_SECTION: bool({ default: true }),
  REACT_APP_FEATURE_FOX_PAGE_FOX_FARMING_SECTION: bool({ default: false }),
  REACT_APP_FEATURE_FOX_PAGE_GOVERNANCE: bool({ default: false }),
  REACT_APP_FEATURE_LIMIT_ORDERS: bool({ default: false }),
  REACT_APP_ZRX_BASE_URL: url(),
  REACT_APP_FEATURE_CHAINFLIP_SWAP: bool({ default: false }),
  REACT_APP_FEATURE_CHAINFLIP_SWAP_DCA: bool({ default: false }),
  REACT_APP_FEATURE_SWAPPER_SOLANA: bool({ default: false }),
  REACT_APP_CHAINFLIP_API_KEY: str(),
  REACT_APP_CHAINFLIP_API_URL: url(),
  REACT_APP_FEATURE_THOR_FREE_FEES: bool({ default: false }),
  REACT_APP_FEATURE_JUPITER_SWAP: bool({ default: false }),
  REACT_APP_JUPITER_API_URL: url({ default: JUPITER_API_URL }),
  REACT_APP_FEATURE_NEW_WALLET_FLOW: bool({ default: false }),
  REACT_APP_FEATURE_FOX_PAGE_FOX_WIF_HAT_SECTION: bool({ default: false }),
  REACT_APP_FEATURE_NEW_LIMIT_FLOW: bool({ default: false }),
  REACT_APP_FEATURE_THORCHAIN_SWAPPER_ACK: bool({ default: false }),
  REACT_APP_FEATURE_THORCHAIN_POOLS_INSTABILITY_WARNINGS: bool({ default: false }),
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
