import type { Revocable } from '..'
import type * as BIP32 from '../bip32'
import type * as Ed25519 from '../ed25519'

export interface TonSeed extends Partial<Revocable> {
  toTonMasterKey(): Promise<Ed25519.Node>
}

export interface Mnemonic extends Partial<Revocable> {
  toSeed(passphrase?: string): Promise<BIP32.Seed>
  toTonSeed?(password?: string): Promise<TonSeed>
}
