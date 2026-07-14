import * as core from '@shapeshiftoss/hdwallet-core'

import { Isolation } from './crypto'
import { AptosAdapter } from './crypto/isolation/adapters/aptos'
import type { NativeHDWalletBase } from './native'

export function MixinNativeAptosWalletInfo<TBase extends core.Constructor<core.HDWalletInfo>>(
  Base: TBase,
) {
  // eslint-disable-next-line @typescript-eslint/no-shadow
  return class MixinNativeAptosWalletInfo extends Base implements core.AptosWalletInfo {
    readonly _supportsAptosInfo = true

    aptosGetAccountPaths(msg: core.AptosGetAccountPaths): core.AptosAccountPath[] {
      return core.aptosGetAccountPaths(msg)
    }

    aptosNextAccountPath(msg: core.AptosAccountPath): core.AptosAccountPath | undefined {
      return core.aptosNextAccountPath(msg)
    }
  }
}

export function MixinNativeAptosWallet<TBase extends core.Constructor<NativeHDWalletBase>>(
  Base: TBase,
) {
  // eslint-disable-next-line @typescript-eslint/no-shadow
  return class MixinNativeAptosWallet extends Base {
    readonly _supportsAptos = true

    aptosAdapter: AptosAdapter | undefined

    async aptosInitializeWallet(ed25519MasterKey: Isolation.Core.Ed25519.Node): Promise<void> {
      const nodeAdapter = new Isolation.Adapters.Ed25519(ed25519MasterKey)
      this.aptosAdapter = new AptosAdapter(nodeAdapter)
    }

    aptosWipe() {
      this.aptosAdapter = undefined
    }

    async aptosGetAddress(msg: core.AptosGetAddress): Promise<string | null> {
      return this.needsMnemonic(!!this.aptosAdapter, () => {
        return this.aptosAdapter!.getAddress(msg.addressNList)
      })
    }

    async aptosSignTx(msg: core.AptosSignTx): Promise<core.AptosSignedTx | null> {
      return this.needsMnemonic(!!this.aptosAdapter, async () => {
        const { signature, publicKey } = await this.aptosAdapter!.signTransaction(
          msg.signingMessageBytes,
          msg.addressNList,
        )

        return {
          signature,
          publicKey,
          rawTransactionBytes: msg.rawTransactionBytes,
        }
      })
    }
  }
}
