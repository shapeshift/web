import { addressNListToBIP32, slip44ByCoin } from './utils'
import type { BIP32Path, HDWallet, HDWalletInfo, PathDescription } from './wallet'

export interface AptosGetAddress {
  addressNList: BIP32Path
  showDisplay?: boolean
}

export interface AptosSignTx {
  addressNList: BIP32Path
  /** Raw transaction bytes to sign (BCS serialized) */
  txBytes: Uint8Array
}

export interface AptosSignedTx {
  signature: string
  publicKey: string
  txBytes: Uint8Array
}

export interface AptosGetAccountPaths {
  accountIdx: number
}

export interface AptosAccountPath {
  addressNList: BIP32Path
}

export interface AptosWalletInfo extends HDWalletInfo {
  readonly _supportsAptosInfo: boolean

  /**
   * Returns a list of bip32 paths for a given account index in preferred order
   * from most to least preferred.
   */
  aptosGetAccountPaths(msg: AptosGetAccountPaths): AptosAccountPath[]

  /**
   * Returns the "next" account path, if any.
   */
  aptosNextAccountPath(msg: AptosAccountPath): AptosAccountPath | undefined
}

export interface AptosWallet extends AptosWalletInfo, HDWallet {
  readonly _supportsAptos: boolean

  aptosGetAddress(msg: AptosGetAddress): Promise<string | null>
  aptosSignTx(msg: AptosSignTx): Promise<AptosSignedTx | null>
}

export function aptosDescribePath(path: BIP32Path): PathDescription {
  const pathStr = addressNListToBIP32(path)
  const unknown: PathDescription = {
    verbose: pathStr,
    coin: 'Aptos',
    isKnown: false,
  }

  // Aptos uses m/44'/637'/0'/0'/0' - standard BIP44 with SLIP-44 = 637
  // https://github.com/aptos-labs/aptos-core/blob/main/sdk/src/wallet.rs
  const slip44 = slip44ByCoin('Aptos')
  if (slip44 === undefined) return unknown
  if (path.length != 5) return unknown
  if (path[0] != 0x80000000 + 44) return unknown
  if (path[1] != 0x80000000 + slip44) return unknown
  if (path[2] != 0x80000000 + 0) return unknown
  if (path[3] != 0x80000000 + 0) return unknown
  if ((path[4] & 0x80000000) >>> 0 !== 0) return unknown

  const index = path[4] & 0x7fffffff
  return {
    verbose: `Aptos Account #${index}`,
    accountIdx: index,
    wholeAccount: true,
    coin: 'Aptos',
    isKnown: true,
  }
}

// Aptos uses standard BIP44 derivation: m/44'/637'/0'/0'/<address_index>
// https://github.com/satoshilabs/slips/blob/master/slip-0044.md (637 = Aptos)
export function aptosGetAccountPaths(msg: AptosGetAccountPaths): AptosAccountPath[] {
  const slip44 = slip44ByCoin('Aptos')
  if (slip44 === undefined) return []
  return [
    {
      addressNList: [
        0x80000000 + 44,
        0x80000000 + slip44,
        0x80000000 + 0,
        0x80000000 + 0,
        msg.accountIdx,
      ],
    },
  ]
}

export function aptosNextAccountPath(msg: AptosAccountPath): AptosAccountPath | undefined {
  const slip44 = slip44ByCoin('Aptos')
  if (slip44 === undefined) return undefined
  // Only return next if the path looks like m/44'/637'/0'/0'/n
  if (msg.addressNList.length !== 5) return undefined
  if (msg.addressNList[0] !== 0x80000000 + 44) return undefined
  if (msg.addressNList[1] !== 0x80000000 + slip44) return undefined
  if (msg.addressNList[2] !== 0x80000000 + 0) return undefined
  if (msg.addressNList[3] !== 0x80000000 + 0) return undefined
  if ((msg.addressNList[4] & 0x80000000) >>> 0 !== 0) return undefined

  const nextIndex = (msg.addressNList[4] & 0x7fffffff) + 1
  return {
    addressNList: [
      0x80000000 + 44,
      0x80000000 + slip44,
      0x80000000 + 0,
      0x80000000 + 0,
      nextIndex,
    ],
  }
}
