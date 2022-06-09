import * as envalid from 'envalid'
import { bool } from 'envalid'
import forEach from 'lodash/forEach'

import env from './env'

const { cleanEnv, str, url, num } = envalid

// add validators for each .env variable
// note env vars must be prefixed with REACT_APP_
const validators = {
  REACT_APP_LOG_LEVEL: str({ default: 'info' }),
  REACT_APP_UNCHAINED_ETHEREUM_HTTP_URL: url(),
  REACT_APP_UNCHAINED_ETHEREUM_WS_URL: url(),
  REACT_APP_UNCHAINED_BITCOIN_HTTP_URL: url(),
  REACT_APP_UNCHAINED_BITCOIN_WS_URL: url(),
  REACT_APP_UNCHAINED_COSMOS_HTTP_URL: url(),
  REACT_APP_UNCHAINED_COSMOS_WS_URL: url(),
  REACT_APP_UNCHAINED_OSMOSIS_HTTP_URL: url(),
  REACT_APP_UNCHAINED_OSMOSIS_WS_URL: url(),
  REACT_APP_ETHEREUM_NODE_URL: url(),
  REACT_APP_KEEPKEY_VERSIONS_URL: url(),
  REACT_APP_WALLET_MIGRATION_URL: url(),
  REACT_APP_PORTIS_DAPP_ID: str({ devDefault: 'fakePortisId' }),
  REACT_APP_GEM_COINIFY_SUPPORTED_COINS: url(),
  REACT_APP_GEM_WYRE_SUPPORTED_COINS: url(),
  REACT_APP_GEM_ASSET_LOGO: url(),
  REACT_APP_GEM_ENV: str(),
  REACT_APP_GEM_API_KEY: str(),
  REACT_APP_FRIENDLY_CAPTCHA_SITE_KEY: str(),
  REACT_APP_FOXY_APY: num({ default: 0.15 }),
  REACT_APP_ETH_FOX_APR: num({ default: 0.6 }),
  REACT_APP_FEATURE_YEARN: bool({ default: true }),
  REACT_APP_FEATURE_OSMOSIS: bool({ default: false }),
  REACT_APP_FEATURE_TALLYHO_WALLET: bool({ default: false }),
  REACT_APP_FEATURE_FOX_PAGE: bool({ default: false }),
  REACT_APP_FEATURE_KEPLR_WALLET: bool({ default: false }),
  REACT_APP_TOKEMAK_STATS_URL: url({ default: 'https://stats.tokemaklabs.com/' }),
  REACT_APP_COINGECKO_API_KEY: str({ default: '' }), // not required, we can fall back to the free tier
  REACT_APP_BOARDROOM_API_BASE_URL: url({
    default: 'https://api.boardroom.info/v1/protocols/shapeshift/',
  }),
  REACT_APP_BOARDROOM_APP_BASE_URL: url({
    default: 'https://boardroom.io/shapeshift/',
  }),
}

function reporter<T>({ errors }: envalid.ReporterOptions<T>) {
  forEach(errors, (err, key) => {
    if (!err) return
    err.message = key
    console.error(err, key, 'Invalid Config')
  })
}

export const getConfig = () => cleanEnv(env, validators, { reporter })
