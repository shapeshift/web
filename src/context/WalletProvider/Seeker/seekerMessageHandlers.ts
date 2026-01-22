/**
 * Seeker Wallet Message Handlers
 *
 * These functions communicate with the mobile app's SeekerWalletManager
 * via postMessage. The actual MWA protocol handling happens in the mobile app.
 *
 * This file mirrors the pattern in MobileWallet/mobileMessageHandlers.ts
 */

type Command =
  | 'seekerCheckAvailability'
  | 'seekerAuthorize'
  | 'seekerDeauthorize'
  | 'seekerGetAddress'
  | 'seekerGetStatus'
  | 'seekerSignTransaction'
  | 'seekerSignAndSendTransaction'

type Message =
  | { cmd: 'seekerCheckAvailability' }
  | { cmd: 'seekerAuthorize'; cluster?: 'mainnet-beta' | 'devnet' | 'testnet' }
  | { cmd: 'seekerDeauthorize' }
  | { cmd: 'seekerGetAddress' }
  | { cmd: 'seekerGetStatus' }
  | { cmd: 'seekerSignTransaction'; transaction: string }
  | { cmd: 'seekerSignAndSendTransaction'; transaction: string }

type MessageFromMobileApp = {
  id: string
  result: unknown
}

export type SeekerAvailabilityResult = {
  available: boolean
}

export type SeekerAuthResult = {
  success: boolean
  address?: string
  label?: string
  error?: string
}

export type SeekerAddressResult = {
  address: string | null
}

export type SeekerStatusResult = {
  available: boolean
  isAuthorized: boolean
  address: string | null
}

export type SeekerSignResult = {
  success: boolean
  signedTransaction?: string
  error?: string
}

export type SeekerSendResult = {
  success: boolean
  signature?: string
  error?: string
}

/**
 * Create a Promise that sends a message to the mobile app and waits for response
 */
const postMessage = <T>(msg: Message): Promise<T> => {
  return new Promise((resolve, reject) => {
    const id = `${Date.now()}-${msg.cmd}`
    try {
      const eventListener = (event: MessageEvent<MessageFromMobileApp>) => {
        if (event.data?.id === id) {
          window.removeEventListener('message', eventListener)
          resolve(event.data.result as T)
        }
      }

      // Timeout after 30 seconds (MWA operations can take a while for user approval)
      setTimeout(() => {
        window.removeEventListener('message', eventListener)
        reject(new Error(`Seeker ${msg.cmd} timed out`))
      }, 30000)

      window.addEventListener('message', eventListener)
      window.ReactNativeWebView?.postMessage(JSON.stringify({ ...msg, id }))
    } catch (e) {
      console.error('[Seeker postMessage]', e)
      reject(e)
    }
  })
}

/**
 * Check if Seeker wallet is available on this device
 */
export const checkSeekerAvailability = (): Promise<SeekerAvailabilityResult> => {
  return postMessage<SeekerAvailabilityResult>({ cmd: 'seekerCheckAvailability' })
}

/**
 * Request authorization from Seeker wallet
 * This will open the Seeker wallet UI for user approval
 */
export const seekerAuthorize = (
  cluster: 'mainnet-beta' | 'devnet' | 'testnet' = 'mainnet-beta',
): Promise<SeekerAuthResult> => {
  return postMessage<SeekerAuthResult>({ cmd: 'seekerAuthorize', cluster })
}

/**
 * Deauthorize from Seeker wallet
 */
export const seekerDeauthorize = (): Promise<{ success: boolean; error?: string }> => {
  return postMessage<{ success: boolean; error?: string }>({ cmd: 'seekerDeauthorize' })
}

/**
 * Get the authorized Solana address
 */
export const seekerGetAddress = (): Promise<SeekerAddressResult> => {
  return postMessage<SeekerAddressResult>({ cmd: 'seekerGetAddress' })
}

/**
 * Get the current Seeker wallet status
 */
export const seekerGetStatus = (): Promise<SeekerStatusResult> => {
  return postMessage<SeekerStatusResult>({ cmd: 'seekerGetStatus' })
}

/**
 * Sign a transaction via Seeker wallet
 * @param transaction - Base64 encoded serialized transaction
 * @returns Base64 encoded signed transaction
 */
export const seekerSignTransaction = (transaction: string): Promise<SeekerSignResult> => {
  return postMessage<SeekerSignResult>({ cmd: 'seekerSignTransaction', transaction })
}

/**
 * Sign and send a transaction via Seeker wallet
 * @param transaction - Base64 encoded serialized transaction
 * @returns Transaction signature
 */
export const seekerSignAndSendTransaction = (transaction: string): Promise<SeekerSendResult> => {
  return postMessage<SeekerSendResult>({ cmd: 'seekerSignAndSendTransaction', transaction })
}
