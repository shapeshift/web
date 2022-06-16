import * as envalid from 'envalid'

export const validators = Object.freeze({
  REACT_APP_UNCHAINED_BITCOIN_HTTP_URL: envalid.url(),
  REACT_APP_UNCHAINED_BITCOIN_WS_URL: envalid.url(),
})
