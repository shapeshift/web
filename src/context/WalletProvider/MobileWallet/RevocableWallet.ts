import { Revocable } from '@shapeshiftoss/hdwallet-native-vault/dist/util'
import { generateMnemonic, validateMnemonic } from 'bip39'

import type { MobileWalletInfoWithMnemonic, RevocableObject } from './types'

type Info = Partial<MobileWalletInfoWithMnemonic>

class Wallet {
  #info: Info

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
    this.#info.mnemonic = generateMnemonic()
  }

  toJSON() {
    return { ...this.#info }
  }
}

export type RevocableWallet = RevocableObject<Wallet>

export const createRevocableWallet: (wallet: Info) => RevocableWallet = wallet =>
  new (Revocable(Wallet))(wallet)
