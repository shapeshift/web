import * as guarded from 'config/guarded'

const validators = {
  REACT_APP_GEM_API_KEY: guarded.str({
    default: 'bb4164a72246dae1e03010d664d6cdae4e19b2554de02e3bf6c3cd30aa7e359e',
  }),
  REACT_APP_GEM_ASSET_LOGO: guarded.url({
    default: 'https://gem-widgets-assets.s3-us-west-2.amazonaws.com/currencies/crypto/',
  }),
  REACT_APP_GEM_COINIFY_SUPPORTED_COINS: guarded.url({
    default: 'https://api.gem.co/institutions/coinify/supported_currencies',
  }),
  REACT_APP_GEM_ENV: guarded.str({
    default: 'production',
    choices: ['production', 'sandbox'],
  }),
  REACT_APP_GEM_WYRE_SUPPORTED_COINS: guarded.url({
    default: 'https://api.gem.co/institutions/wyre/supported_currencies',
  }),
}

// eslint-disable-next-line import/no-default-export
export default validators
