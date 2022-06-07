import * as guarded from 'config/guarded'

const validators = {
  REACT_APP_COINGECKO_API_KEY: guarded.str({ default: '' }),
}

// eslint-disable-next-line import/no-default-export
export default validators
