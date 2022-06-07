import * as guarded from 'config/guarded'

const validators = {
  REACT_APP_KEEPKEY_VERSIONS_URL: guarded.url({
    default: 'https://raw.githack.com/keepkey/keepkey-updater/master/firmware/releases.json',
  }),
}

// eslint-disable-next-line import/no-default-export
export default validators
