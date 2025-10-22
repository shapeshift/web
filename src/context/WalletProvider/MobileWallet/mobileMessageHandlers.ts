import type { RevocableWallet } from '@/context/WalletProvider/MobileWallet/RevocableWallet'
import { createRevocableWallet } from '@/context/WalletProvider/MobileWallet/RevocableWallet'
import type {
  MobileWalletInfo,
  MobileWalletInfoWithMnemonic,
} from '@/context/WalletProvider/MobileWallet/types'

type Command =
  | 'getWallet'
  | 'deleteWallet'
  | 'updateWallet'
  | 'hasWallet'
  | 'addWallet'
  | 'listWallets'
  | 'getWalletCount'
  | 'reloadWebview'
  | 'getExpoToken'
  | 'requestStoreReview'
  | 'getAppVersion'

export type HapticLevel = 'light' | 'medium' | 'heavy' | 'soft' | 'rigid'

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
      cmd: 'listWallets' | 'getWalletCount'
    }
  | {
      cmd: 'showDeveloperModal'
      key: string
    }
  | {
      cmd: 'reloadWebview'
    }
  | {
      cmd: 'getExpoToken'
    }
  | {
      cmd: 'vibrate'
      level: HapticLevel
    }
  | {
      cmd: 'requestStoreReview'
    }
  | {
      cmd: 'getAppVersion'
    }

export type MessageFromMobileApp = {
  id: number
  result: unknown
}

export type MobileAppVersion = {
  version: string
  build: string
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
const postMessage = <T>(msg: Message): Promise<T> => {
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
        // @see https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/removeEventListener
        // No effect if `eventListener` has already been removed
        window.removeEventListener('message', eventListener)
        reject(new Error(`PostMessage ${msg.cmd} timed out`))
      }, 10000)

      window.addEventListener('message', eventListener)

      window.ReactNativeWebView?.postMessage(JSON.stringify({ ...msg, id }))
    } catch (e) {
      console.error(e)
      reject(e)
    }
  })
}

/**
 * Show the native developer modal to allow switching environments
 */
export const showDeveloperModal = (): Promise<void> => {
  return postMessage({ cmd: 'showDeveloperModal', key: 'show' })
}

/**
 * Get a list of available wallets stored in the mobile app
 *
 * The list does not include the mnemonic for the wallets
 */
export const listWallets = (): Promise<RevocableWallet[]> => {
  return postMessage<RevocableWallet[]>({ cmd: 'listWallets' })
}

/**
 * Get a specific wallet by ID
 *
 * The ID is provided in the `listWallets` call
 */
export const getWallet = async (key: string): Promise<RevocableWallet | null> => {
  const wallet = await postMessage<MobileWalletInfoWithMnemonic | null>({ cmd: 'getWallet', key })
  return wallet ? createRevocableWallet(wallet) : null
}

/**
 * Returns the number of wallets available from the mobile app
 */
export const getWalletCount = (): Promise<number> => {
  // mobile app returns the number of wallets saved
  return postMessage<number>({ cmd: 'getWalletCount' })
}

/**
 * Rename a wallet
 */
export const updateWallet = (key: string, walletInfo: { label: string }): Promise<boolean> => {
  return postMessage<boolean>({ cmd: 'updateWallet', key, label: walletInfo.label })
}

/**
 * Ask the mobile app to save a new mnemonic
 *
 * The mobile app will send back the new wallet's `id`, `label`, and `createdAt`.
 *
 * This is the only way to get save a wallet in the mobile app as the mobile app
 * generates the IDs and keeps track of a list of wallets by ID.
 */
export const addWallet = async (walletInfo: {
  label: string
  mnemonic: string
}): Promise<RevocableWallet | null> => {
  const newWallet = await postMessage<MobileWalletInfo | null>({ cmd: 'addWallet', ...walletInfo })
  return newWallet ? createRevocableWallet({ ...newWallet, mnemonic: walletInfo.mnemonic }) : null
}

/**
 * Create a local `Wallet` instance with a new mnemonic
 *
 * This DOES NOT save the wallet to the mobile app
 */
export const createWallet = (): RevocableWallet => {
  const newWallet = createRevocableWallet({})
  newWallet.generateMnemonic()
  return newWallet
}

/**
 * Ask the mobile app to remove a saved wallet.
 *
 * This operation cannot be undone.
 */
export const deleteWallet = (key: string): Promise<boolean> => {
  return postMessage<boolean>({ cmd: 'deleteWallet', key })
}

/**
 * Ask the mobile app to reload the webview.
 */
export const reloadWebview = (): Promise<boolean> => {
  return postMessage<boolean>({ cmd: 'reloadWebview' })
}

/**
export const getExpoToken = (): Promise<string | null> => {
  return postMessage<string | null>({ cmd: 'getExpoToken' })
}

/**
 * Trigger device haptic feedback via the mobile app.
 * No-ops when not running inside a React Native WebView.
 */
export const mobileVibrate = (level: HapticLevel): Promise<void> => {
  return postMessage<void>({ cmd: 'vibrate', level })
}

/**
 * Open the store review dialog on mobile.
 */
export const requestStoreReview = (): Promise<boolean> => {
  return postMessage<boolean>({ cmd: 'requestStoreReview' })
}

/**
 * Get the app version from the mobile app.
 */
export const requestAppVersion = (): Promise<MobileAppVersion | undefined> => {
  return postMessage<MobileAppVersion>({ cmd: 'getAppVersion' })
}
