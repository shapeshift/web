import * as guarded from 'config/guarded'

const validators = {
  REACT_APP_ETH_FOX_APR: guarded.num({ devDefault: 0.6, guard: x => x >= 0.0 }),
}

// eslint-disable-next-line import/no-default-export
export default validators
