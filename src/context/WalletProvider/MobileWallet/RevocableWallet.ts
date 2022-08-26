import { Revocable } from '@shapeshiftoss/hdwallet-native-vault/dist/util'
import { generateMnemonic } from 'bip39'

import { MobileWalletInfo, RevocableObject } from './types'

type MobileWalletInfoMnemonic = MobileWalletInfo & { mnemonic?: string }
class Wallet {
  #info: MobileWalletInfoMnemonic

  constructor(wallet: MobileWalletInfoMnemonic) {
    this.#info = { ...wallet }
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

export const createRevocableWallet: (
  wallet: MobileWalletInfoMnemonic,
) => RevocableWallet = wallet => new (Revocable(Wallet))(wallet)
