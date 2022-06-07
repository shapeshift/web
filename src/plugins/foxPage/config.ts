import { type ValidatorResults, getConfig as baseGetConfig } from 'config'
import * as guarded from 'config/guarded'

export const validators = {
  REACT_APP_FEATURE_FOX_PAGE: guarded.bool({ default: false }),
  REACT_APP_TOKEMAK_STATS_URL: guarded.url({ default: 'https://stats.tokemaklabs.com/' }),
  REACT_APP_BOARDROOM_API_BASE_URL: guarded.url({
    default: 'https://api.boardroom.info/v1/protocols/shapeshift/',
  }),
  REACT_APP_BOARDROOM_APP_BASE_URL: guarded.url({
    default: 'https://boardroom.io/shapeshift/',
  }),
  REACT_APP_TOKEMAK_TFOX_POOL_ADDRESS: guarded.ethAddress({
    default: '0x808d3e6b23516967ceae4f17a5f9038383ed5311',
  }),
}

export type Config = ValidatorResults<typeof validators>
export const getConfig = () => baseGetConfig(validators)
