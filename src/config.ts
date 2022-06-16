import * as envalid from 'envalid'
import { memoize } from 'lodash'
import forEach from 'lodash/forEach'
import { activePluginValidators } from 'plugins/config'
import * as ta from 'type-assertions'

import env from './env'

export type ValidatorSet = Record<string, envalid.ValidatorSpec<unknown>>

export type ValidatorResult<T extends Record<string, envalid.ValidatorSpec<any>>> = Readonly<
  {
    [K in keyof T]: ReturnType<T[K]['_parse']>
  } & envalid.CleanedEnvAccessors
>

// add validators for each .env variable
// note env vars must be prefixed with REACT_APP_
export const baseValidators = {
  REACT_APP_LOG_LEVEL: envalid.str({ default: 'info' }),
  REACT_APP_ALCHEMY_POLYGON_URL: envalid.url(),
  REACT_APP_KEEPKEY_VERSIONS_URL: envalid.url(),
  REACT_APP_WALLET_MIGRATION_URL: envalid.url(),
  REACT_APP_PORTIS_DAPP_ID: envalid.str({ devDefault: 'fakePortisId' }),
  REACT_APP_COINBASE_SUPPORTED_COINS: envalid.url(),
  REACT_APP_COINBASE_PAY_APP_ID: envalid.str({ devDefault: '1dbd2a0b94' }), // Default is coinbase Testing App.
  REACT_APP_GEM_COINIFY_SUPPORTED_COINS: envalid.url(),
  REACT_APP_GEM_WYRE_SUPPORTED_COINS: envalid.url(),
  REACT_APP_GEM_ASSET_LOGO: envalid.url(),
  REACT_APP_GEM_ENV: envalid.str(),
  REACT_APP_GEM_API_KEY: envalid.str(),
  REACT_APP_FRIENDLY_CAPTCHA_SITE_KEY: envalid.str(),
  REACT_APP_FEATURE_OSMOSIS: envalid.bool({ default: false }),
  REACT_APP_FEATURE_COINBASE_RAMP: envalid.bool({ default: false }),
  REACT_APP_COINGECKO_API_KEY: envalid.str({ default: '' }), // not required, we can fall back to the free tier
}
ta.assert<ta.Extends<typeof baseValidators, ValidatorSet>>()

function reporter<T>({ errors }: envalid.ReporterOptions<T>) {
  forEach(errors, (err, key) => {
    if (!err) return
    err.message = key
    console.error(err, key, 'Invalid Config')
  })
}

export const getConfigWithValidators = memoize(
  <T extends ValidatorSet>(validators: T): ValidatorResult<T> =>
    envalid.cleanEnv(env, validators, { reporter }) as ValidatorResult<T>,
)

export const getConfig = memoize(() => {
  return getConfigWithValidators({
    ...baseValidators,
    ...activePluginValidators,
  })
})
