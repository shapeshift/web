import type { Keyring } from '@shapeshiftoss/hdwallet-core'
import { Events } from '@shapeshiftoss/hdwallet-core'
import { EthereumProvider } from '@walletconnect/ethereum-provider'
import type { EthereumProviderOptions } from '@walletconnect/ethereum-provider/dist/types/EthereumProvider'

import { WalletConnectV2HDWallet } from './walletconnectV2'

export type DirectPairingOptions = {
  onDisplayUri: (uri: string) => void
  signal: AbortSignal
}

const cancelled = (): DOMException => new DOMException('Wallet connection cancelled', 'AbortError')

export class WalletConnectV2Adapter {
  keyring: Keyring
  private readonly providerConfig: EthereumProviderOptions

  private constructor(keyring: Keyring, config: EthereumProviderOptions) {
    this.keyring = keyring
    this.providerConfig = config
  }

  public static useKeyring(keyring: Keyring, config: EthereumProviderOptions) {
    return new WalletConnectV2Adapter(keyring, config)
  }

  public async initialize(): Promise<number> {
    return Object.keys(this.keyring.wallets).length
  }

  private async initializeDirectWallet(
    wallet: WalletConnectV2HDWallet,
    provider: Awaited<ReturnType<typeof EthereumProvider.init>>,
    { onDisplayUri, signal }: DirectPairingOptions,
  ): Promise<void> {
    if (signal.aborted) throw cancelled()
    const restoredTopic = provider.session?.topic
    const attempt = { pairingTopic: undefined as string | undefined }
    const disconnectPairing = async () => {
      if (!attempt.pairingTopic) return
      try {
        await provider.signer.client.core.pairing.disconnect({
          topic: attempt.pairingTopic,
        })
      } catch {
        console.warn('Could not clean up cancelled WalletConnect pairing')
      }
    }
    const displayUri = (uri: string) => {
      attempt.pairingTopic = uri.slice(3, uri.indexOf('@'))
      if (signal.aborted) {
        void disconnectPairing()
        return
      }
      onDisplayUri(uri)
    }
    provider.on('display_uri', displayUri)
    const abort = new AbortController()
    const cancellation = new Promise<never>((_, reject) => {
      signal.addEventListener(
        'abort',
        () => {
          void disconnectPairing()
          reject(cancelled())
        },
        { once: true, signal: abort.signal },
      )
    })
    try {
      const pairing = provider
        .connect()
        .then(() => wallet.initialize())
        .then(async () => {
          if (!signal.aborted) return
          const topic = provider.session?.topic
          if (topic && topic !== restoredTopic) {
            await provider.signer.client.disconnect({
              topic,
              reason: { code: 6000, message: 'Wallet connection cancelled' },
            })
          }
          throw cancelled()
        })
        .finally(() => provider.removeListener('display_uri', displayUri))
      await Promise.race([pairing, cancellation])
      if (signal.aborted) throw cancelled()
    } catch (error) {
      if (!signal.aborted) {
        await disconnectPairing()
        const topic = provider.session?.topic
        if (topic && topic !== restoredTopic) {
          await provider.signer.client
            .disconnect({ topic, reason: { code: 6000, message: 'Wallet connection failed' } })
            .catch(() => console.warn('Could not clean up failed WalletConnect session'))
        }
      }
      throw error
    } finally {
      abort.abort()
    }
  }

  public async pairDevice(options?: DirectPairingOptions): Promise<WalletConnectV2HDWallet> {
    try {
      if (!this.providerConfig) {
        throw new Error('WalletConnectV2 provider configuration not set.')
      }

      if (options?.signal.aborted) throw cancelled()
      const provider = await EthereumProvider.init(
        options ? { ...this.providerConfig, showQrModal: false } : this.providerConfig,
      )
      if (options?.signal.aborted) throw cancelled()
      const restoredTopic = options ? provider.session?.topic : undefined
      const wallet = new WalletConnectV2HDWallet(provider)

      //  Enable session (triggers QR Code modal)
      if (options) {
        await this.initializeDirectWallet(wallet, provider, options)
      } else {
        await wallet.initialize()
      }
      const deviceID = await wallet.getDeviceID()
      if (options?.signal.aborted) {
        await wallet.disconnect()
        throw cancelled()
      }
      this.keyring.add(wallet, deviceID)
      this.keyring.emit(['WalletConnectV2', deviceID, Events.CONNECT], deviceID)
      if (restoredTopic && restoredTopic !== provider.session?.topic) {
        void provider.signer.client
          .disconnect({
            topic: restoredTopic,
            reason: { code: 6000, message: 'Wallet connection replaced' },
          })
          .catch(() => console.warn('Could not clean up replaced WalletConnect session'))
      }
      return wallet
    } catch (error) {
      console.error('Could not pair WalletConnectV2')
      throw error
    }
  }
}
