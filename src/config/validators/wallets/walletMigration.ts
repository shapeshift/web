import * as guarded from 'config/guarded'

export const validators = {
  REACT_APP_FRIENDLY_CAPTCHA_SITE_KEY: guarded.str({
    default: 'FCMM7AFC0S6A8NUK',
  }),
  REACT_APP_WALLET_MIGRATION_URL: guarded.url({
    default: 'https://wallets.shapeshift.com/api/migrate',
  }),
}

// eslint-disable-next-line import/no-default-export
export default validators
