import * as core from '@shapeshiftoss/hdwallet-core'

import { StarknetInjectedError, StarknetInjectedHDWallet } from './starknetInjected'
import type { StarknetInjectedProviderId, StarknetWindowObject } from './types'

declare global {
  interface Window {
    starknet_argentX?: StarknetWindowObject
    starknet_braavos?: StarknetWindowObject
    starknet_bramble?: StarknetWindowObject
  }
}

export const getStarknetInjectedProvider = (
  providerId: StarknetInjectedProviderId,
): StarknetWindowObject | undefined => window[`starknet_${providerId}`]

const PROVIDER_INJECTION_TIMEOUT_MS = 1000
const PROVIDER_INJECTION_POLL_MS = 100

// Extensions can inject after the app starts restoring a session on page load
const waitForStarknetInjectedProvider = async (
  providerId: StarknetInjectedProviderId,
): Promise<StarknetWindowObject | undefined> => {
  const deadline = Date.now() + PROVIDER_INJECTION_TIMEOUT_MS
  let provider = getStarknetInjectedProvider(providerId)
  while (!provider && Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, PROVIDER_INJECTION_POLL_MS))
    provider = getStarknetInjectedProvider(providerId)
  }
  return provider
}

abstract class StarknetInjectedAdapter {
  keyring: core.Keyring

  protected abstract readonly providerId: StarknetInjectedProviderId
  protected abstract readonly vendor: string
  protected abstract readonly installUrl: string

  protected constructor(keyring: core.Keyring) {
    this.keyring = keyring
  }

  public async initialize(): Promise<number> {
    return Object.keys(this.keyring.wallets).length
  }

  // `silent` is used to restore a previous session on load without prompting the user
  public async pairDevice(silent = false): Promise<StarknetInjectedHDWallet | undefined> {
    const provider = silent
      ? await waitForStarknetInjectedProvider(this.providerId)
      : getStarknetInjectedProvider(this.providerId)

    if (!provider) {
      if (silent) return undefined
      window.open(this.installUrl, '_blank')
      console.error(`Please install ${this.vendor}!`)
      throw new StarknetInjectedError('PROVIDER_NOT_FOUND', `${this.vendor} provider not found`)
    }

    const wallet = new StarknetInjectedHDWallet(this.providerId, provider, this.vendor)
    const address = await wallet.connect(silent)
    if (!address) {
      if (silent) return undefined
      throw new StarknetInjectedError('NO_ACCOUNT', `No ${this.vendor} account found`)
    }

    // Only prompt to switch network on an explicit connect, then re-read the mainnet account
    if (!silent && (await wallet.ensureMainnet()) && !(await wallet.connect(true))) {
      throw new StarknetInjectedError(
        'NO_ACCOUNT',
        `No ${this.vendor} account found on Starknet Mainnet`,
      )
    }

    await wallet.initialize()
    const deviceID = await wallet.getDeviceID()
    // The extension exposes a single active account - drop wallets left over from earlier accounts
    await Promise.all(
      Object.keys(this.keyring.wallets)
        .filter(id => id.startsWith(`${this.providerId}:`))
        .map(id => this.keyring.remove(id)),
    )
    this.keyring.add(wallet, deviceID)
    this.keyring.emit([this.vendor, deviceID, core.Events.CONNECT], deviceID)

    return wallet
  }
}

// Ready Wallet (formerly Argent X) still injects under the legacy `argentX` id
export class ReadyAdapter extends StarknetInjectedAdapter {
  protected readonly providerId = 'argentX'
  protected readonly vendor = 'Ready'
  protected readonly installUrl = 'https://www.ready.co/'

  public static useKeyring(keyring: core.Keyring) {
    return new ReadyAdapter(keyring)
  }
}

export class BraavosAdapter extends StarknetInjectedAdapter {
  protected readonly providerId = 'braavos'
  protected readonly vendor = 'Braavos'
  protected readonly installUrl = 'https://braavos.app/'

  public static useKeyring(keyring: core.Keyring) {
    return new BraavosAdapter(keyring)
  }
}

export class BrambleAdapter extends StarknetInjectedAdapter {
  protected readonly providerId = 'bramble'
  protected readonly vendor = 'Bramble'
  protected readonly installUrl = 'https://bramble.fi/'

  public static useKeyring(keyring: core.Keyring) {
    return new BrambleAdapter(keyring)
  }
}
