import { logger } from 'lib/logger'

type Command =
  | 'getWallet'
  | 'deleteWallet'
  | 'setWallet'
  | 'hasWallet'
  | 'addWallet'
  | 'listWallets'

type Message =
  | {
      cmd: Command
      key: string
    }
  | {
      cmd: 'setWallet'
      key: string
      label: string
      mnemonic: string
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

const postMessage = async <T extends string | boolean>(msg: Message): Promise<T> => {
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
        reject(new Error('Request timed out'))
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
  return postMessage<string>({ cmd: 'listWallets' })
}

export const getWallet = (key: string) => {
  moduleLogger.trace({ fn: 'getWallet', key }, 'Get Wallet')
  return postMessage<string>({ cmd: 'getWallet', key })
}

export const hasWallet = (key: string) => {
  moduleLogger.trace({ fn: 'hasWallet', key }, 'Has Wallet')
  return postMessage<boolean>({ cmd: 'hasWallet', key })
}

export const setWallet = (key: string, wallet: { label: string; mnemonic: string }) => {
  moduleLogger.trace({ fn: 'setWallet', key }, 'Set Wallet')
  return postMessage<boolean>({ cmd: 'setWallet', key, ...wallet })
}

export const addWallet = (wallet: { label: string; mnemonic: string }) => {
  moduleLogger.trace({ fn: 'addWallet' }, 'Add Wallet')
  return postMessage<boolean>({ cmd: 'addWallet', ...wallet })
}

export const deleteWallet = (key: string) => {
  moduleLogger.trace({ fn: 'deleteWallet', key }, 'Delete Wallet')
  return postMessage<boolean>({ cmd: 'deleteWallet', key })
}
