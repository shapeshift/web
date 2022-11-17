import { WalletConnectBridge } from './WalletConnectBridge'

// don't export me, access me through the getter
let _walletConnectBridge: WalletConnectBridge = new WalletConnectBridge()

// we need to be able to access this outside react
export const getWalletConnectBridge = (): WalletConnectBridge => _walletConnectBridge
