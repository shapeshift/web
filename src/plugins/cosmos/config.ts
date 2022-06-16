import * as envalid from 'envalid'

export const validators = Object.freeze({
  REACT_APP_UNCHAINED_COSMOS_HTTP_URL: envalid.url(),
  REACT_APP_UNCHAINED_COSMOS_WS_URL: envalid.url(),
})
