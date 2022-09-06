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

/**
 * Create a Promise that sends a message and waits for the matching response
 *
 * This app uses `ReactNativeWebView.postMessage` to send a string to the mobile app
 * The mobile app injects a `postMessage` call into the web app with a response
 *
 * Responses are matched to requests via an ID (Date.now())
 *
 * A 10 second timeout is included to avoid the Promise hanging
 */
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

/**
 * Get a list of available wallets stored in the mobile app
 *
 * The list does not include the mnemonic for the wallets
 */
export const listWallets = () => {
  moduleLogger.trace({ fn: 'listWallets' }, 'List Wallets')
  return postMessage<RevocableWallet[]>({ cmd: 'listWallets' })
}

/**
 * Get a specific wallet by ID
 *
 * The ID is provided in the `listWallets` call
 */
export const getWallet = async (key: string) => {
  moduleLogger.trace({ fn: 'getWallet', key }, 'Get Wallet')
  const wallet = await postMessage<MobileWalletInfoWithMnemonic | null>({ cmd: 'getWallet', key })
  return wallet ? createRevocableWallet(wallet) : null
}

/**
 * Returns `true` if the mobile app has at least 1 saved wallet
 */
export const hasWallets = () => {
  moduleLogger.trace({ fn: 'hasWallets' }, 'Has Wallets')
  // mobile app returns the number of wallets saved
  return postMessage<number>({ cmd: 'hasWallets' })
}

/**
 * Returns `true` is a given wallet by `ID` exists in the mobile app
 */
export const hasWallet = (key: string) => {
  moduleLogger.trace({ fn: 'hasWallet', key }, 'Has Wallet')
  return postMessage<boolean>({ cmd: 'hasWallet', key })
}

/**
 * Rename a wallet
 */
export const updateWallet = (key: string, wallet: { label: string }) => {
  moduleLogger.trace({ fn: 'updateWallet', key, wallet }, 'Update Wallet')
  return postMessage<boolean>({ cmd: 'updateWallet', key, label: wallet.label })
}

/**
 * Ask the mobile app to save a new mnemonic
 *
 * The mobile app will send back the new wallet's `id`, `label`, and `createdAt`.
 *
 * This is the only way to get save a wallet in the mobile app as the mobile app
 * generates the IDs and keeps track of a list of wallets by ID.
 * @param wallet
 */
export const addWallet = async (wallet: { label: string; mnemonic: string }) => {
  moduleLogger.trace({ fn: 'addWallet' }, 'Add Wallet')
  const w = await postMessage<MobileWalletInfo | null>({ cmd: 'addWallet', ...wallet })
  return w ? createRevocableWallet({ ...w, mnemonic: wallet.mnemonic }) : null
}

/**
 * Create a local `Wallet` instance with a new mnemonic
 *
 * This DOES NOT save the wallet to the mobile app
 */
export const createWallet = () => {
  const w = createRevocableWallet({})
  w.generateMnemonic()
  return w
}

/**
 * Ask the mobile app to remove a saved wallet.
 *
 * This operation cannot be undone.
 */
export const deleteWallet = (key: string) => {
  moduleLogger.trace({ fn: 'deleteWallet', key }, 'Delete Wallet')
  return postMessage<boolean>({ cmd: 'deleteWallet', key })
}
