import * as envalid from 'envalid'

export const validators = Object.freeze({
  REACT_APP_PENDO_API_KEY: envalid.str({ default: '67c2f326-a6c2-4aa2-4559-08a53b679e93' }),
  REACT_APP_PENDO_CONSENT_VERSION: envalid.str({ default: 'v1' }),
  REACT_APP_PENDO_SUB_ID: envalid.str({ default: '6047664892149760' }),
  REACT_APP_PENDO_UNSAFE_DESIGNER_MODE: envalid.bool({ default: false }),
  REACT_APP_PENDO_VISITOR_ID_PREFIX: envalid.str({ default: 'test_visitor' }),
})
