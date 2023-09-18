import { Core } from '@walletconnect/core'
import type { ICore } from '@walletconnect/types'
import type { IWeb3Wallet } from '@walletconnect/web3wallet'
import { Web3Wallet } from '@walletconnect/web3wallet'
import { getConfig } from 'config'

let walletConnectWallet: Promise<IWeb3Wallet>
let core: ICore

// WalletConnect Core singleton
export const getWalletConnectCore = () => {
  if (!core) {
    const walletConnectProjectId = getConfig().REACT_APP_WALLET_CONNECT_PROJECT_ID
    core = new Core({
      projectId: walletConnectProjectId,
    })
  }

  return core
}

// WalletConnect Web3Wallet singleton
export const getWalletConnectWallet = () => {
  if (!walletConnectWallet) {
    walletConnectWallet = Web3Wallet.init({
      core, // <- pass the shared `core` instance
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
