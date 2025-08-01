import * as envalid from 'envalid'
import { bool } from 'envalid'
import forEach from 'lodash/forEach'
import memoize from 'lodash/memoize'

import { JUPITER_API_URL } from '@/constants/urls'

const { cleanEnv, str, url } = envalid

// add validators for each .env variable
// note env vars must be prefixed with VITE_
const validators = {
  VITE_LOG_LEVEL: str({ default: 'info' }),
  VITE_REDUX_WINDOW: bool({ default: false }),
  VITE_UNCHAINED_ETHEREUM_HTTP_URL: url(),
  VITE_UNCHAINED_ETHEREUM_WS_URL: url(),
  VITE_UNCHAINED_AVALANCHE_HTTP_URL: url(),
  VITE_UNCHAINED_AVALANCHE_WS_URL: url(),
  VITE_UNCHAINED_OPTIMISM_HTTP_URL: url(),
  VITE_UNCHAINED_OPTIMISM_WS_URL: url(),
  VITE_UNCHAINED_BNBSMARTCHAIN_HTTP_URL: url(),
  VITE_UNCHAINED_BNBSMARTCHAIN_WS_URL: url(),
  VITE_UNCHAINED_POLYGON_HTTP_URL: url(),
  VITE_UNCHAINED_POLYGON_WS_URL: url(),
  VITE_UNCHAINED_GNOSIS_HTTP_URL: url(),
  VITE_UNCHAINED_GNOSIS_WS_URL: url(),
  VITE_UNCHAINED_ARBITRUM_HTTP_URL: url(),
  VITE_UNCHAINED_ARBITRUM_WS_URL: url(),
  VITE_UNCHAINED_ARBITRUM_NOVA_HTTP_URL: url(),
  VITE_UNCHAINED_ARBITRUM_NOVA_WS_URL: url(),
  VITE_UNCHAINED_BASE_HTTP_URL: url(),
  VITE_UNCHAINED_BASE_WS_URL: url(),
  VITE_UNCHAINED_BITCOIN_HTTP_URL: url(),
  VITE_UNCHAINED_BITCOIN_WS_URL: url(),
  VITE_UNCHAINED_BITCOINCASH_HTTP_URL: url(),
  VITE_UNCHAINED_BITCOINCASH_WS_URL: url(),
  VITE_UNCHAINED_DOGECOIN_HTTP_URL: url(),
  VITE_UNCHAINED_DOGECOIN_WS_URL: url(),
  VITE_UNCHAINED_LITECOIN_HTTP_URL: url(),
  VITE_UNCHAINED_LITECOIN_WS_URL: url(),
  VITE_UNCHAINED_COSMOS_HTTP_URL: url(),
  VITE_UNCHAINED_COSMOS_WS_URL: url(),
  VITE_UNCHAINED_THORCHAIN_HTTP_URL: url(),
  VITE_UNCHAINED_THORCHAIN_WS_URL: url(),
  VITE_UNCHAINED_THORCHAIN_V1_HTTP_URL: url(),
  VITE_UNCHAINED_MAYACHAIN_HTTP_URL: url(),
  VITE_UNCHAINED_MAYACHAIN_WS_URL: url(),
  VITE_UNCHAINED_SOLANA_HTTP_URL: url(),
  VITE_UNCHAINED_SOLANA_WS_URL: url(),
  VITE_THORCHAIN_NODE_URL: url(),
  VITE_MAYACHAIN_NODE_URL: url(),
  VITE_ETHEREUM_NODE_URL: url(),
  VITE_AVALANCHE_NODE_URL: url(),
  VITE_OPTIMISM_NODE_URL: url(),
  VITE_BNBSMARTCHAIN_NODE_URL: url(),
  VITE_POLYGON_NODE_URL: url(),
  VITE_GNOSIS_NODE_URL: url(),
  VITE_ARBITRUM_NODE_URL: url(),
  VITE_ARBITRUM_NOVA_NODE_URL: url(),
  VITE_BASE_NODE_URL: url(),
  VITE_SOLANA_NODE_URL: url(),
  VITE_ALCHEMY_POLYGON_URL: url(),
  VITE_KEEPKEY_VERSIONS_URL: url(),
  VITE_KEEPKEY_LATEST_RELEASE_URL: url(),
  VITE_WALLET_MIGRATION_URL: url(),
  VITE_EXCHANGERATEHOST_BASE_URL: url(),
  VITE_EXCHANGERATEHOST_API_KEY: str(),
  VITE_MTPELERIN_ASSETS_API: url(),
  VITE_MTPELERIN_BUY_URL: url(),
  VITE_MTPELERIN_SELL_URL: url(),
  VITE_MTPELERIN_REFERRAL_CODE: str(),
  VITE_MTPELERIN_INTEGRATION_KEY: str(),
  VITE_FRIENDLY_CAPTCHA_SITE_KEY: str(),
  VITE_FEATURE_COWSWAP: bool({ default: false }),
  VITE_FEATURE_OPTIMISM: bool({ default: false }),
  VITE_FEATURE_BNBSMARTCHAIN: bool({ default: false }),
  VITE_FEATURE_POLYGON: bool({ default: false }),
  VITE_FEATURE_GNOSIS: bool({ default: false }),
  VITE_FEATURE_ARBITRUM: bool({ default: false }),
  VITE_FEATURE_ARBITRUM_NOVA: bool({ default: false }),
  VITE_FEATURE_SOLANA: bool({ default: false }),
  VITE_FEATURE_BASE: bool({ default: false }),
  VITE_FEATURE_MAYACHAIN: bool({ default: false }),
  VITE_FEATURE_ZRX_SWAP: bool({ default: false }),
  VITE_FEATURE_THOR_SWAP: bool({ default: false }),
  VITE_FEATURE_SAVERS_VAULTS: bool({ default: false }),
  VITE_FEATURE_SAVERS_VAULTS_DEPOSIT: bool({ default: false }),
  VITE_FEATURE_SAVERS_VAULTS_WITHDRAW: bool({ default: false }),
  VITE_FEATURE_CUSTOM_TOKEN_IMPORT: bool({ default: false }),
  // A flag encapsulating all WalletConnect to dApps - v1 and v2
  VITE_FEATURE_WALLET_CONNECT_TO_DAPPS: bool({ default: false }),
  VITE_FEATURE_WALLET_CONNECT_TO_DAPPS_V2: bool({ default: false }),
  VITE_FEATURE_LEDGER_WALLET: bool({ default: false }),
  VITE_FEATURE_WALLET_CONNECT_V2: bool({ default: false }),
  VITE_WALLET_CONNECT_TO_DAPPS_PROJECT_ID: str({ default: '' }),
  VITE_WALLET_CONNECT_WALLET_PROJECT_ID: str({ default: '' }),
  VITE_WALLET_CONNECT_RELAY_URL: str({ default: 'wss://relay.walletconnect.com' }),
  VITE_TOKEMAK_STATS_URL: url({ default: 'https://stats.tokemaklabs.com/' }),
  VITE_BOARDROOM_API_BASE_URL: url({
    default: 'https://api.boardroom.info/v1/protocols/shapeshift/',
  }),
  VITE_BOARDROOM_APP_BASE_URL: url({ default: 'https://boardroom.io/shapeshift/' }),
  VITE_THORCHAIN_MIDGARD_URL: url({ default: 'https://midgard.thorchain.info/v2' }),
  VITE_MAYACHAIN_MIDGARD_URL: url({ default: 'https://midgard.mayachain.info/v2' }),
  VITE_COWSWAP_BASE_URL: url({ default: 'https://api.cow.fi' }),
  VITE_ONRAMPER_WIDGET_URL: url(),
  VITE_ONRAMPER_API_URL: url(),
  VITE_ONRAMPER_API_KEY: str(),
  VITE_ONRAMPER_SIGNING_KEY: str(),
  VITE_KEEPKEY_UPDATER_RELEASE_PAGE: url({
    default: 'https://github.com/keepkey/keepkey-desktop/releases/latest',
  }),
  VITE_KEEPKEY_UPDATER_BASE_URL: url({
    default: 'https://github.com/keepkey/keepkey-desktop/releases/download/',
  }),
  VITE_ETHERSCAN_API_KEY: str({ default: 'XT8BI6VDYUGD9675X861ATHZNK3AN6HRMF' }),
  VITE_MIXPANEL_TOKEN: str({ default: '' }),
  VITE_SNAPSHOT_BASE_URL: url({ default: 'https://snapshot.org/#/shapeshiftdao.eth' }),
  VITE_FEATURE_MIXPANEL: bool({ default: false }),
  VITE_FEATURE_DYNAMIC_LP_ASSETS: bool({ default: false }),
  VITE_FEATURE_READ_ONLY_ASSETS: bool({ default: false }),
  VITE_FEATURE_ARBITRUM_BRIDGE: bool({ default: false }),
  VITE_FEATURE_PORTALS_SWAPPER: bool({ default: false }),
  VITE_FEATURE_ONE_INCH: bool({ default: false }),
  VITE_SENTRY_DSN_URL: url(),
  VITE_ALCHEMY_API_KEY: str(),
  VITE_ALCHEMY_SOLANA_BASE_URL: url(),
  VITE_PORTALS_API_KEY: str(),
  VITE_CHATWOOT_TOKEN: str(),
  VITE_CHATWOOT_URL: str(),
  VITE_FEATURE_CHATWOOT: bool({ default: false }),
  VITE_FEATURE_ADVANCED_SLIPPAGE: bool({ default: false }),
  VITE_EXPERIMENTAL_CUSTOM_SEND_NONCE: bool({ default: false }),
  VITE_SNAP_ID: str(),
  VITE_SNAP_VERSION: str(),
  VITE_FEATURE_THORCHAIN_LENDING: bool({ default: false }),
  VITE_FEATURE_THORCHAIN_LENDING_BORROW: bool({ default: false }),
  VITE_FEATURE_THORCHAIN_LENDING_REPAY: bool({ default: false }),
  VITE_FEATURE_THORCHAIN_LP: bool({ default: false }),
  VITE_FEATURE_THORCHAIN_LP_DEPOSIT: bool({ default: false }),
  VITE_FEATURE_THORCHAIN_LP_WITHDRAW: bool({ default: false }),
  VITE_FEATURE_THORCHAINSWAP_LONGTAIL: bool({ default: false }),
  VITE_FEATURE_THORCHAINSWAP_L1_TO_LONGTAIL: bool({ default: false }),
  VITE_FEATURE_SHAPESHIFT_MOBILE_WALLET: bool({ default: false }),
  VITE_FEATURE_ACCOUNT_MANAGEMENT: bool({ default: false }),
  VITE_FEATURE_ACCOUNT_MANAGEMENT_LEDGER: bool({ default: false }),
  VITE_FEATURE_RFOX: bool({ default: false }),
  VITE_FEATURE_RFOX_LP: bool({ default: false }),
  VITE_FEATURE_ARBITRUM_BRIDGE_CLAIMS: bool({ default: false }),
  VITE_FEATURE_USDT_APPROVAL_RESET: bool({ default: false }),
  VITE_FEATURE_RUNEPOOL: bool({ default: false }),
  VITE_FEATURE_RUNEPOOL_DEPOSIT: bool({ default: false }),
  VITE_FEATURE_RUNEPOOL_WITHDRAW: bool({ default: false }),
  VITE_FEATURE_MARKETS: bool({ default: false }),
  VITE_PORTALS_BASE_URL: url(),
  VITE_ZERION_BASE_URL: url(),
  VITE_FEATURE_PHANTOM_WALLET: bool({ default: false }),
  VITE_FEATURE_FOX_PAGE: bool({ default: false }),
  VITE_FEATURE_FOX_PAGE_RFOX: bool({ default: false }),
  VITE_FEATURE_FOX_PAGE_FOX_SECTION: bool({ default: true }),
  VITE_FEATURE_FOX_PAGE_FOX_FARMING_SECTION: bool({ default: false }),
  VITE_FEATURE_FOX_PAGE_GOVERNANCE: bool({ default: false }),
  VITE_FEATURE_LIMIT_ORDERS: bool({ default: false }),
  VITE_ZRX_BASE_URL: url(),
  VITE_FEATURE_CHAINFLIP_SWAP: bool({ default: false }),
  VITE_FEATURE_CHAINFLIP_SWAP_DCA: bool({ default: false }),
  VITE_FEATURE_SWAPPER_SOLANA: bool({ default: false }),
  VITE_CHAINFLIP_API_KEY: str(),
  VITE_CHAINFLIP_API_URL: url(),
  VITE_FEATURE_THOR_FREE_FEES: bool({ default: false }),
  VITE_FEATURE_JUPITER_SWAP: bool({ default: false }),
  VITE_JUPITER_API_URL: url({ default: JUPITER_API_URL }),
  VITE_FEATURE_NEW_WALLET_FLOW: bool({ default: false }),
  VITE_FEATURE_NEW_LIMIT_FLOW: bool({ default: false }),
  VITE_FEATURE_THORCHAIN_SWAPPER_ACK: bool({ default: false }),
  VITE_FEATURE_SWAPPER_RELAY: bool({ default: false }),
  VITE_FEATURE_ACTION_CENTER: bool({ default: false }),
  VITE_FEATURE_THORCHAIN_TCY: bool({ default: false }),
  VITE_FEATURE_THORCHAIN_TCY_WIDGET: bool({ default: false }),
  VITE_FEATURE_THORCHAIN_TCY_ACTIVITY: bool({ default: false }),
  VITE_RELAY_API_URL: url(),
  VITE_COINCAP_API_KEY: str(),
  VITE_FEATURE_MAYA_SWAP: bool({ default: false }),
  VITE_FEATURE_BUTTERSWAP: bool({ default: false }),
  VITE_FEATURE_TX_HISTORY_BYE_BYE: bool({ default: false }),
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

export const getConfig = memoize(() => {
  return Object.freeze({ ...cleanEnv(import.meta.env ?? process.env, validators, { reporter }) })
})
