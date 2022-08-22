import { AxelarAssetTransfer, Environment } from '@axelar-network/axelarjs-sdk'

// don't export me, access me through the getter
let _axelarAssetTransferSdk: AxelarAssetTransfer = new AxelarAssetTransfer({
  environment: Environment.MAINNET,
  auth: 'metamask',
})

export const getAxelarAssetTransferSdk = (): AxelarAssetTransfer => {
  return _axelarAssetTransferSdk
}
