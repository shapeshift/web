import { AxelarQueryAPI, Environment } from '@axelar-network/axelarjs-sdk'

// don't export me, access me through the getter
let _axelarQuerySdk: AxelarQueryAPI = new AxelarQueryAPI({
  environment: Environment.MAINNET,
})

export const getAxelarQuerySdk = (): AxelarQueryAPI => {
  return _axelarQuerySdk
}
