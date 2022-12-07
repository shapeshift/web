import { crypto } from '@shapeshiftoss/hdwallet-native'
import { generateMnemonic, validateMnemonic } from 'bip39'

import type { MobileWalletInfoWithMnemonic, RevocableObject } from './types'

export const Revocable = crypto.Isolation.Engines.Default.Revocable
export const revocable = crypto.Isolation.Engines.Default.revocable

type Info = Partial<MobileWalletInfoWithMnemonic>

/**
 * Privately store a wallet and its mnemonic
 * Private variable is used to prevent leaking the information
 */
class Wallet {
  readonly #info: Info

  constructor(wallet: Info) {
    this.#info = { createdAt: Date.now(), ...wallet }
  }

  get id() {
    return this.#info.id
  }

  get label() {
    return this.#info.label
  }

  set label(value) {
    this.#info.label = value
  }

  get createdAt() {
    return this.#info.createdAt
  }

  get mnemonic() {
    return this.#info.mnemonic
  }

  set mnemonic(value) {
    if (value && !validateMnemonic(value)) {
      throw new Error('Invalid mnemonic')
    }
    this.#info.mnemonic = value
  }

  getWords() {
    return this.#info.mnemonic?.split(' ')
  }

  generateMnemonic() {
    this.mnemonic = generateMnemonic()
  }

  /**
   * Convert the class into JSON that can be passed back to the mobile app
   */
  toJSON() {
    return { ...this.#info }
  }
}

export type RevocableWallet = RevocableObject<Wallet>

/**
 * Creates a Wallet instance that is wrapped in a revocable Proxy
 * This allows us to purge the mnemonic from memory after loading it into HDWallet
 */
export const createRevocableWallet: (wallet: Info) => RevocableWallet = wallet =>
  new (Revocable(Wallet))(wallet)
