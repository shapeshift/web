import * as core from '@shapeshiftoss/hdwallet-core'
import { createSHA3 } from 'hash-wasm'

import type { Isolation } from '../..'

const ED25519_PUBLIC_KEY_SIZE = 32

/**
 * Aptos uses Ed25519 signing with BIP44 derivation path m/44'/637'/0'/0'/0'
 * Addresses are derived from the Ed25519 public key using SHA3-256 truncated to 32 bytes.
 * The @aptos-labs/ts-sdk handles BCS serialization and transaction construction.
 */
export class AptosAdapter {
  protected readonly nodeAdapter: Isolation.Adapters.Ed25519

  constructor(nodeAdapter: Isolation.Adapters.Ed25519) {
    this.nodeAdapter = nodeAdapter
  }

  async getAddress(addressNList: core.BIP32Path): Promise<string> {
    const publicKey = await this.getPublicKeyRaw(addressNList)

    const SIGNATURE_SCHEME_FLAG_ED25519 = 0x00
    const flaggedPublicKey = new Uint8Array(publicKey.length + 1)
    flaggedPublicKey.set(publicKey, 0)
    flaggedPublicKey[publicKey.length] = SIGNATURE_SCHEME_FLAG_ED25519

    const sha3 = await createSHA3(256)
    sha3.init()
    sha3.update(flaggedPublicKey)
    return `0x${sha3.digest('hex')}`
  }

  async getPublicKey(addressNList: core.BIP32Path): Promise<string> {
    const publicKey = await this.getPublicKeyRaw(addressNList)
    return Buffer.from(publicKey).toString('hex')
  }

  private async getPublicKeyRaw(addressNList: core.BIP32Path): Promise<Buffer> {
    const nodeAdapter = await this.nodeAdapter.derivePath(
      core.addressNListToHardenedBIP32(addressNList),
    )
    const publicKey = await nodeAdapter.getPublicKey()

    if (publicKey.length !== ED25519_PUBLIC_KEY_SIZE) {
      throw new Error(`Invalid Ed25519 public key size: ${publicKey.length}`)
    }

    return Buffer.from(publicKey)
  }

  async signTransaction(
    txBytes: Uint8Array,
    addressNList: core.BIP32Path,
  ): Promise<{ signature: string; publicKey: string }> {
    const nodeAdapter = await this.nodeAdapter.derivePath(
      core.addressNListToHardenedBIP32(addressNList),
    )
    const publicKey = await nodeAdapter.getPublicKey()
    const signature = await nodeAdapter.node.sign(txBytes)

    return {
      signature: Buffer.from(signature).toString('hex'),
      publicKey: Buffer.from(publicKey).toString('hex'),
    }
  }
}

export default AptosAdapter
