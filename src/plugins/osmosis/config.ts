import * as envalid from 'envalid'

export const validators = Object.freeze({
  REACT_APP_UNCHAINED_OSMOSIS_HTTP_URL: envalid.url(),
  REACT_APP_UNCHAINED_OSMOSIS_WS_URL: envalid.url(),
})
