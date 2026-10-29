import * as core from '@shapeshiftoss/hdwallet-core'
import { createSHA3 } from 'hash-wasm'

import type { Isolation } from '../..'

const ED25519_PUBLIC_KEY_SIZE = 32
const RAW_TRANSACTION_SALT = 'APTOS::RawTransaction'
const SIGNATURE_SCHEME_FLAG_ED25519 = 0x00

export class AptosAdapter {
  protected readonly nodeAdapter: Isolation.Adapters.Ed25519

  constructor(nodeAdapter: Isolation.Adapters.Ed25519) {
    this.nodeAdapter = nodeAdapter
  }

  async getAddress(addressNList: core.BIP32Path): Promise<string> {
    const publicKey = await this.getPublicKey(addressNList)

    const flaggedPublicKey = new Uint8Array(publicKey.length + 1)
    flaggedPublicKey.set(publicKey, 0)
    flaggedPublicKey[publicKey.length] = SIGNATURE_SCHEME_FLAG_ED25519

    const sha3 = await createSHA3(256)
    sha3.init()
    sha3.update(flaggedPublicKey)

    return `0x${sha3.digest('hex')}`
  }

  private async getPublicKey(addressNList: core.BIP32Path): Promise<Buffer> {
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
    rawTransactionBytes: Uint8Array,
    addressNList: core.BIP32Path,
  ): Promise<{ signature: string; publicKey: string }> {
    const nodeAdapter = await this.nodeAdapter.derivePath(
      core.addressNListToHardenedBIP32(addressNList),
    )

    const publicKey = await nodeAdapter.getPublicKey()

    const sha3 = await createSHA3(256)
    sha3.init()
    sha3.update(RAW_TRANSACTION_SALT)

    const signingMessage = Buffer.concat([sha3.digest('binary'), rawTransactionBytes])
    const signature = await nodeAdapter.node.sign(signingMessage)

    return {
      signature: Buffer.from(signature).toString('hex'),
      publicKey: Buffer.from(publicKey).toString('hex'),
    }
  }
}

export default AptosAdapter
