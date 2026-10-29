import * as core from '@shapeshiftoss/hdwallet-core'
import { createSHA3 } from 'hash-wasm'

import type { Isolation } from '../..'

const ED25519_PUBLIC_KEY_SIZE = 32
const RAW_TRANSACTION_SALT = 'APTOS::RawTransaction'
const SIGNATURE_SCHEME_FLAG_ED25519 = 0x00

const sha3_256 = async (data: Uint8Array | string): Promise<Uint8Array> => {
  const sha3 = await createSHA3(256)
  sha3.init()
  sha3.update(data)
  return sha3.digest('binary')
}

export class AptosAdapter {
  protected readonly nodeAdapter: Isolation.Adapters.Ed25519

  constructor(nodeAdapter: Isolation.Adapters.Ed25519) {
    this.nodeAdapter = nodeAdapter
  }

  async getAddress(addressNList: core.BIP32Path): Promise<string> {
    const { publicKey } = await this.deriveNode(addressNList)

    const authKey = await sha3_256(
      Buffer.concat([publicKey, Buffer.from([SIGNATURE_SCHEME_FLAG_ED25519])]),
    )

    return `0x${Buffer.from(authKey).toString('hex')}`
  }

  private async deriveNode(addressNList: core.BIP32Path) {
    const nodeAdapter = await this.nodeAdapter.derivePath(
      core.addressNListToHardenedBIP32(addressNList),
    )

    const publicKey = Buffer.from(await nodeAdapter.getPublicKey())
    if (publicKey.length !== ED25519_PUBLIC_KEY_SIZE) {
      throw new Error(`Invalid Ed25519 public key size: ${publicKey.length}`)
    }

    return { nodeAdapter, publicKey }
  }

  async signTransaction(
    rawTransactionBytes: Uint8Array,
    addressNList: core.BIP32Path,
  ): Promise<{ signature: string; publicKey: string }> {
    const { nodeAdapter, publicKey } = await this.deriveNode(addressNList)

    const signingMessage = Buffer.concat([
      await sha3_256(RAW_TRANSACTION_SALT),
      rawTransactionBytes,
    ])
    const signature = await nodeAdapter.node.sign(signingMessage)

    return {
      signature: Buffer.from(signature).toString('hex'),
      publicKey: publicKey.toString('hex'),
    }
  }
}

export default AptosAdapter
