import { generateMnemonic } from 'bip39'
import {
  createRevocableWallet,
  RevocableWallet,
} from 'context/WalletProvider/MobileWallet/RevocableWallet'
import {
  MobileWalletInfo,
  MobileWalletInfoWithMnemonic,
} from 'context/WalletProvider/MobileWallet/types'
import { logger } from 'lib/logger'

type Command =
  | 'getWallet'
  | 'deleteWallet'
  | 'updateWallet'
  | 'hasWallet'
  | 'addWallet'
  | 'listWallets'

type Message =
  | {
      cmd: Command
      key: string
    }
  | {
      cmd: 'updateWallet'
      key: string
      label: string
    }
  | {
      cmd: 'addWallet'
      label: string
      mnemonic: string
    }
  | {
      cmd: 'listWallets'
    }

export type MessageFromMobileApp = {
  id: number
  result: unknown
}

const postMessage = async <T>(msg: Message): Promise<T> => {
  return new Promise((resolve, reject) => {
    const id = Date.now()
    try {
      const eventListener = (event: MessageEvent<MessageFromMobileApp>) => {
        if (event.data?.id === id) {
          window.removeEventListener('message', eventListener)
          resolve(event.data.result as T)
        }
      }
      // Make sure that the Promise doesn't hang forever
      setTimeout(() => {
        window.removeEventListener('message', eventListener)
        reject(new Error('PostMessage timed out'))
      }, 10000)

      window.addEventListener('message', eventListener)

      window.ReactNativeWebView?.postMessage(JSON.stringify({ ...msg, id }))
    } catch (e) {
      reject(e)
    }
  })
}

const moduleLogger = logger.child({ namespace: ['lib', 'mobileWallet'] })

export const listWallets = () => {
  moduleLogger.trace({ fn: 'listWallets' }, 'List Wallets')
  return postMessage<RevocableWallet[]>({ cmd: 'listWallets' })
}

export const getWallet = async (key: string) => {
  moduleLogger.trace({ fn: 'getWallet', key }, 'Get Wallet')
  const wallet = await postMessage<MobileWalletInfoWithMnemonic | null>({ cmd: 'getWallet', key })
  return wallet ? createRevocableWallet(wallet) : null
}

export const hasWallet = (key: string) => {
  moduleLogger.trace({ fn: 'hasWallet', key }, 'Has Wallet')
  return postMessage<boolean>({ cmd: 'hasWallet', key })
}

export const updateWallet = (key: string, wallet: { label: string }) => {
  moduleLogger.trace({ fn: 'updateWallet', key, wallet }, 'Update Wallet')
  return postMessage<boolean>({ cmd: 'updateWallet', key, label: wallet.label })
}

export const addWallet = async (wallet: { label: string; mnemonic: string }) => {
  moduleLogger.trace({ fn: 'addWallet' }, 'Add Wallet')
  const w = await postMessage<MobileWalletInfo | null>({ cmd: 'addWallet', ...wallet })
  return w ? createRevocableWallet(w) : null
}

export const createWallet = async (wallet: { label: string }) => {
  moduleLogger.trace({ fn: 'createWallet' }, 'Create Wallet')
  const w = await postMessage<MobileWalletInfo | null>({
    cmd: 'addWallet',
    label: wallet.label,
    mnemonic: generateMnemonic(),
  })
  return w ? createRevocableWallet(w) : null
}

export const deleteWallet = (key: string) => {
  moduleLogger.trace({ fn: 'deleteWallet', key }, 'Delete Wallet')
  return postMessage<boolean>({ cmd: 'deleteWallet', key })
}
