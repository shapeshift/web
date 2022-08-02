import { AxelarQueryAPI, Environment } from '@axelar-network/axelarjs-sdk'

// don't export me, access me through the getter
let _axelarSdk: AxelarQueryAPI = new AxelarQueryAPI({
  environment: Environment.MAINNET,
})

export const getAxelarSdk = (): AxelarQueryAPI => {
  return _axelarSdk
}
