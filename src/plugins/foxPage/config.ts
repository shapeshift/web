import * as envalid from 'envalid'

export const validators = Object.freeze({
  REACT_APP_TOKEMAK_STATS_URL: envalid.url({ default: 'https://stats.tokemaklabs.com/' }),
  REACT_APP_BOARDROOM_API_BASE_URL: envalid.url({
    default: 'https://api.boardroom.info/v1/protocols/shapeshift/',
  }),
  REACT_APP_BOARDROOM_APP_BASE_URL: envalid.url({
    default: 'https://boardroom.io/shapeshift/',
  }),
})
