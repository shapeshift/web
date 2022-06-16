import * as envalid from 'envalid'

export const validators = Object.freeze({
  REACT_APP_ETHEREUM_NODE_URL: envalid.url(),
  REACT_APP_UNCHAINED_ETHEREUM_HTTP_URL: envalid.url(),
  REACT_APP_UNCHAINED_ETHEREUM_WS_URL: envalid.url(),
})
