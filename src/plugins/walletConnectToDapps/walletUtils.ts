import type { IWalletKit } from '@reown/walletkit'
import { WalletKit } from '@reown/walletkit'
import type WalletConnectCore from '@walletconnect/core'
import { Core } from '@walletconnect/core'

import { getConfig } from '@/config'

let walletConnectWallet: Promise<IWalletKit>
let core: WalletConnectCore

// WalletConnect Core singleton
export const getWalletConnectCore = () => {
  if (!core) {
    const walletConnectToDappsProjectId = getConfig().VITE_WALLET_CONNECT_TO_DAPPS_PROJECT_ID
    core = new Core({
      projectId: walletConnectToDappsProjectId,
    })
  }

  return core
}

// WalletConnect Web3Wallet singleton
export const getWalletConnectWallet = () => {
  if (!walletConnectWallet) {
    walletConnectWallet = WalletKit.init({
      core: getWalletConnectCore(), // <- pass the shared `core` instance
      metadata: {
        name: 'ShapeShift',
        description:
          'A free open source platform to trade, track, buy, and earn. Community-owned. Private. Non-custodial. Multi-chain.',
        url: 'https://app.shapeshift.com/',
        icons: ['https://app.shapeshift.com/icon-512x512.png'],
      },
    })
  }

  return walletConnectWallet
}
