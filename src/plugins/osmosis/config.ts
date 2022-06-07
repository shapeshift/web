import { type ValidatorResults, getConfig as baseGetConfig } from 'config'
import * as guarded from 'config/guarded'

export const validators = {
  REACT_APP_FEATURE_OSMOSIS: guarded.bool({ default: false }),
  REACT_APP_UNCHAINED_OSMOSIS_HTTP_URL: guarded.httpUrl({
    default: 'https://api.osmosis.shapeshift.com',
    devDefault: 'https://dev-api.osmosis.shapeshift.com',
  }),
  REACT_APP_UNCHAINED_OSMOSIS_WS_URL: guarded.wsUrl({
    default: 'wss://api.osmosis.shapeshift.com',
    devDefault: 'wss://dev-api.osmosis.shapeshift.com',
  }),
}

export type Config = ValidatorResults<typeof validators>
export const getConfig = () => baseGetConfig(validators)
