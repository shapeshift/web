import { Core } from '@walletconnect/core'
import type { ICore } from '@walletconnect/types'
import type { IWeb3Wallet } from '@walletconnect/web3wallet'
import { Web3Wallet } from '@walletconnect/web3wallet'
import { getConfig } from 'config'
import { getLogLevel, logger } from 'lib/logger'

const moduleLogger = logger.child({ namespace: ['walletConnectToDapps', 'walletUtils'] })

let walletConnectWallet: IWeb3Wallet
let core: ICore

// WalletConnect Core singleton
export const getWalletConnectCore = () => {
  const logLevel = getLogLevel()
  const isDebug = logLevel === 'debug'
  const walletConnectProjectId = getConfig().REACT_APP_WALLET_CONNECT_PROJECT_ID
  core = new Core({
    logger: isDebug ? 'debug' : undefined,
    projectId: walletConnectProjectId,
  })

  return core
}

// WalletConnect Web3Wallet singleton
export const getWalletConnectWallet = async () => {
  try {
    walletConnectWallet = await Web3Wallet.init({
      core, // <- pass the shared `core` instance
      metadata: {
        name: 'ShapeShift',
        description:
          'A free open source platform to trade, track, buy, and earn. Community-owned. Private. Non-custodial. Multi-chain.',
        url: 'https://app.shapeshift.com/',
        icons: ['https://app.shapeshift.com/icon-512x512.png'],
      },
    })
  } catch (e) {
    moduleLogger.info(e, 'Could not initialize WalletConnect wallet')
  }

  return walletConnectWallet
}

export async function pair(params: { uri: string }) {
  return await core.pairing.pair({ uri: params.uri })
}
