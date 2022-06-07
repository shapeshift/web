import { type ValidatorResults, getConfig as baseGetConfig } from 'config'
import * as guarded from 'config/guarded'

export const validators = {
  REACT_APP_UNCHAINED_BITCOIN_HTTP_URL: guarded.httpUrl({
    default: 'https://api.ethereum.shapeshift.com',
    devDefault: 'https://dev-api.ethereum.shapeshift.com',
  }),
  REACT_APP_UNCHAINED_BITCOIN_WS_URL: guarded.wsUrl({
    default: 'wss://api.bitcoin.shapeshift.com',
    devDefault: 'wss://dev-api.bitcoin.shapeshift.com',
  }),
}

export type Config = ValidatorResults<typeof validators>
export const getConfig = () => baseGetConfig(validators)
