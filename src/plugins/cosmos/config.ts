import { type ValidatorResults, getConfig as baseGetConfig } from 'config'
import * as guarded from 'config/guarded'

export const validators = {
  REACT_APP_UNCHAINED_COSMOS_HTTP_URL: guarded.httpUrl({
    default: 'https://api.cosmos.shapeshift.com',
    devDefault: 'https://dev-api.cosmos.shapeshift.com',
  }),
  REACT_APP_UNCHAINED_COSMOS_WS_URL: guarded.wsUrl({
    default: 'wss://api.cosmos.shapeshift.com',
    devDefault: 'wss://dev-api.cosmos.shapeshift.com',
  }),
}

export type Config = ValidatorResults<typeof validators>
export const getConfig = () => baseGetConfig(validators)
