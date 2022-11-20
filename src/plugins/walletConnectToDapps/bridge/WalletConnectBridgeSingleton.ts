import { WalletConnectBridge } from './WalletConnectBridge'

// don't export me, access me through the getter
let _walletConnectBridge: WalletConnectBridge | undefined

// we need to be able to access this outside react
export const getWalletConnectBridge = (): WalletConnectBridge => {
  if (!_walletConnectBridge) {
    _walletConnectBridge = new WalletConnectBridge()
  }
  return _walletConnectBridge
}
