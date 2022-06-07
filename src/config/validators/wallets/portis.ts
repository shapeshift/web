import * as guarded from 'config/guarded'

const validators = {
  REACT_APP_PORTIS_DAPP_ID: guarded.str({ devDefault: 'fakePortisId' }),
}

// eslint-disable-next-line import/no-default-export
export default validators
