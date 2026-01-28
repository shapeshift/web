import type {
  SeekerAddressResult,
  SeekerAuthResult,
  SeekerAvailabilityResult,
  SeekerSendResult,
  SeekerSignResult,
  SeekerStatusResult,
} from '@shapeshiftoss/hdwallet-seeker'

type Message = {
  cmd: string
  [key: string]: any
}

type MessageFromMobileApp = {
  id: string
  result: any
}

const postMessage = <T>(msg: Message): Promise<T> => {
  return new Promise((resolve, reject) => {
    const id = `${Date.now()}-${msg.cmd}`
    const timeout = setTimeout(() => {
      window.removeEventListener('message', eventListener)
      reject(new Error(`Seeker message timeout: ${msg.cmd}`))
    }, 30000)

    const eventListener = (event: MessageEvent<MessageFromMobileApp>) => {
      if (event.data?.id === id) {
        clearTimeout(timeout)
        window.removeEventListener('message', eventListener)
        resolve(event.data.result as T)
      }
    }

    window.addEventListener('message', eventListener)

    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ ...msg, id }))
    } else {
      clearTimeout(timeout)
      window.removeEventListener('message', eventListener)
      reject(new Error('ReactNativeWebView not available'))
    }
  })
}

export const checkSeekerAvailability = (): Promise<SeekerAvailabilityResult> => {
  return postMessage<SeekerAvailabilityResult>({
    cmd: 'seekerCheckAvailability',
  })
}

export const seekerAuthorize = (
  cluster?: 'mainnet-beta' | 'devnet' | 'testnet',
): Promise<SeekerAuthResult> => {
  return postMessage<SeekerAuthResult>({
    cmd: 'seekerAuthorize',
    cluster,
  })
}

export const seekerDeauthorize = (): Promise<{ success: boolean; error?: string }> => {
  return postMessage<{ success: boolean; error?: string }>({
    cmd: 'seekerDeauthorize',
  })
}

export const seekerGetAddress = (): Promise<SeekerAddressResult> => {
  return postMessage<SeekerAddressResult>({
    cmd: 'seekerGetAddress',
  })
}

export const seekerGetStatus = (): Promise<SeekerStatusResult> => {
  return postMessage<SeekerStatusResult>({
    cmd: 'seekerGetStatus',
  })
}

export const seekerSignTransaction = (transaction: string): Promise<SeekerSignResult> => {
  return postMessage<SeekerSignResult>({
    cmd: 'seekerSignTransaction',
    transaction,
  })
}

export const seekerSignAndSendTransaction = (transaction: string): Promise<SeekerSendResult> => {
  return postMessage<SeekerSendResult>({
    cmd: 'seekerSignAndSendTransaction',
    transaction,
  })
}

export const seekerGetPublicKey = (derivationPath: string): Promise<{ publicKey: string }> => {
  return postMessage<{ publicKey: string }>({
    cmd: 'seekerGetPublicKey',
    derivationPath,
  })
}
