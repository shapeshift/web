import {
  createRevocableWallet,
  RevocableWallet,
} from 'context/WalletProvider/MobileWallet/RevocableWallet'
import type {
  MobileWalletInfo,
  MobileWalletInfoWithMnemonic,
} from 'context/WalletProvider/MobileWallet/types'

import { mobileLogger } from './config'

type Command =
  | 'getWallet'
  | 'deleteWallet'
  | 'updateWallet'
  | 'hasWallet'
  | 'hasWallets'
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
      cmd: 'listWallets' | 'hasWallets'
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

const moduleLogger = mobileLogger.child({ namespace: ['lib', 'mobileWallet'] })

export const listWallets = () => {
  moduleLogger.trace({ fn: 'listWallets' }, 'List Wallets')
  return postMessage<RevocableWallet[]>({ cmd: 'listWallets' })
}

export const getWallet = async (key: string) => {
  moduleLogger.trace({ fn: 'getWallet', key }, 'Get Wallet')
  const wallet = await postMessage<MobileWalletInfoWithMnemonic | null>({ cmd: 'getWallet', key })
  return wallet ? createRevocableWallet(wallet) : null
}

export const hasWallets = () => {
  moduleLogger.trace({ fn: 'hasWallets' }, 'Has Wallets')
  return postMessage<number>({ cmd: 'hasWallets' })
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
  return w ? createRevocableWallet({ ...w, mnemonic: wallet.mnemonic }) : null
}

export const createWallet = () => {
  const w = createRevocableWallet({})
  w.generateMnemonic()
  return w
}

export const deleteWallet = (key: string) => {
  moduleLogger.trace({ fn: 'deleteWallet', key }, 'Delete Wallet')
  return postMessage<boolean>({ cmd: 'deleteWallet', key })
}
