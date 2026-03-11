import * as core from '@shapeshiftoss/hdwallet-core'
import { VersionedTransaction } from '@solana/web3.js'

import { Isolation } from './crypto'
import { SolanaAdapter } from './crypto/isolation/adapters/solana'
import type { NativeHDWalletBase } from './native'

export function MixinNativeSolanaWalletInfo<TBase extends core.Constructor<core.HDWalletInfo>>(
  Base: TBase,
) {
  // eslint-disable-next-line @typescript-eslint/no-shadow
  return class MixinNativeSolanaWalletInfo extends Base implements core.SolanaWalletInfo {
    readonly _supportsSolanaInfo = true

    solanaGetAccountPaths(msg: core.SolanaGetAccountPaths): core.SolanaAccountPath[] {
      return core.solanaGetAccountPaths(msg)
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    solanaNextAccountPath(_msg: core.SolanaAccountPath): core.SolanaAccountPath | undefined {
      throw new Error('Method not implemented')
    }
  }
}

export function MixinNativeSolanaWallet<TBase extends core.Constructor<NativeHDWalletBase>>(
  Base: TBase,
) {
  // eslint-disable-next-line @typescript-eslint/no-shadow
  return class MixinNativeSolanaWallet extends Base {
    readonly _supportsSolana = true

    adapter: SolanaAdapter | undefined

    async solanaInitializeWallet(masterKey: Isolation.Core.Ed25519.Node): Promise<void> {
      const nodeAdapter = new Isolation.Adapters.Ed25519(masterKey)
      this.adapter = new SolanaAdapter(nodeAdapter)
    }

    solanaWipe() {
      this.adapter = undefined
    }

    async solanaGetAddress(msg: core.SolanaGetAddress): Promise<string | null> {
      return this.needsMnemonic(!!this.adapter, () => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return this.adapter!.getAddress(msg.addressNList)
      })
    }

    async solanaSignTx(msg: core.SolanaSignTx): Promise<core.SolanaSignedTx | null> {
      return this.needsMnemonic(!!this.adapter, async () => {
        const address = await this.solanaGetAddress({
          addressNList: msg.addressNList,
          showDisplay: false,
        })

        if (!address) throw new Error('Failed to get Solana address')

        const transaction = core.solanaBuildTransaction(msg, address)
        const signedTransaction = await this.adapter!.signTransaction(transaction, msg.addressNList)

        return {
          serialized: Buffer.from(signedTransaction.serialize()).toString('base64'),
          signatures: signedTransaction.signatures.map(signature =>
            Buffer.from(signature).toString('base64'),
          ),
        }
      })
    }

    async solanaSignSerializedTx(
      msg: core.SolanaSignSerializedTx,
    ): Promise<core.SolanaSignedTx | null> {
      return this.needsMnemonic(!!this.adapter, async () => {
        console.log(`[Bebop Native Sign] Deserializing tx, base64 length: ${msg.serializedTx.length}`)
        const txBytes = Buffer.from(msg.serializedTx, 'base64')
        console.log(`[Bebop Native Sign] Tx bytes length: ${txBytes.length}`)
        const transaction = VersionedTransaction.deserialize(txBytes)
        console.log(`[Bebop Native Sign] Deserialized. Num signatures before signing: ${transaction.signatures.length}`)
        console.log(`[Bebop Native Sign] Message accountKeys: ${transaction.message.staticAccountKeys.map(k => k.toBase58()).join(', ')}`)

        const signedTransaction = await this.adapter!.signTransaction(transaction, msg.addressNList)
        console.log(`[Bebop Native Sign] Signed. Num signatures after signing: ${signedTransaction.signatures.length}`)

        // Extract signatures before attempting serialize - for partially-signed txs
        // (e.g. gasless Bebop where Bebop is the fee payer), serialize() throws because
        // not all required signatures are present yet. The caller may only need signatures.
        const signatures = signedTransaction.signatures.map(signature =>
          Buffer.from(signature).toString('base64'),
        )

        signatures.forEach((sig, i) => {
          const bytes = Buffer.from(sig, 'base64')
          const isZero = bytes.every(b => b === 0)
          console.log(`[Bebop Native Sign] Sig[${i}]: isZero=${isZero}, bytes=${bytes.length}`)
        })

        let serialized: string
        try {
          serialized = Buffer.from(signedTransaction.serialize()).toString('base64')
          console.log(`[Bebop Native Sign] Full serialize succeeded`)
        } catch (e) {
          // Partial signing - serialize the message without signature verification
          console.log(`[Bebop Native Sign] Partial sign - serialize threw (expected for co-signed tx): ${(e as Error).message}`)
          serialized = msg.serializedTx
        }

        return { serialized, signatures }
      })
    }
  }
}
