import { logger } from 'lib/logger'

type Command = 'getKey' | 'deleteKey' | 'setKey' | 'hasKey'

type Message =
  | {
      cmd: Command
    }
  | {
      cmd: 'setKey'
      key: string
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

export const getMnemonic = () => {
  moduleLogger.trace({ fn: 'getMnemonic' }, 'Get Mnemonic')
  return postMessage<string>({ cmd: 'getKey' })
}

export const hasMnemonic = () => {
  moduleLogger.trace({ fn: 'hasMnemonic' }, 'Has Mnemonic')
  return postMessage<boolean>({ cmd: 'hasKey' })
}

export const setMnemonic = (mnemonic: string) => {
  moduleLogger.trace({ fn: 'setMnemonic' }, 'Set Mnemonic')
  return postMessage<boolean>({ cmd: 'setKey', key: mnemonic })
}

export const clearMnemonic = () => {
  moduleLogger.trace({ fn: 'clearMnemonic' }, 'Clear Mnemonic')
  return postMessage<boolean>({ cmd: 'deleteKey' })
}
