import { addressNListToBIP32, slip44ByCoin } from './utils'
import type { BIP32Path, HDWallet, HDWalletInfo, PathDescription } from './wallet'

export interface AptosGetAddress {
  addressNList: BIP32Path
  showDisplay?: boolean
}

export interface AptosSignTx {
  addressNList: BIP32Path
  rawTransactionBytes: Uint8Array // BCS-serialized RawTransaction
}

export interface AptosSignedTx {
  signature: string
  publicKey: string
}

export interface AptosGetAccountPaths {
  accountIdx: number
}

export interface AptosAccountPath {
  addressNList: BIP32Path
}

export interface AptosWalletInfo extends HDWalletInfo {
  readonly _supportsAptosInfo: boolean

  aptosGetAccountPaths(msg: AptosGetAccountPaths): AptosAccountPath[]
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

  const slip44 = slip44ByCoin('Aptos')
  if (slip44 === undefined) return unknown

  if (path.length != 5) return unknown
  if (path[0] != 0x80000000 + 44) return unknown
  if (path[1] != 0x80000000 + slip44) return unknown
  if ((path[2] & 0x80000000) >>> 0 !== 0x80000000) return unknown
  if (path[3] != 0x80000000 + 0) return unknown
  if (path[4] != 0x80000000 + 0) return unknown

  const index = path[2] & 0x7fffffff

  return {
    verbose: `Aptos Account #${index}`,
    accountIdx: index,
    wholeAccount: true,
    coin: 'Aptos',
    isKnown: true,
  }
}

// m/44'/637'/<account>'/0'/0' matches Petra and the aptos sdk (ed25519 requires every level hardened)
export function aptosGetAccountPaths(msg: AptosGetAccountPaths): AptosAccountPath[] {
  const slip44 = slip44ByCoin('Aptos')
  if (slip44 === undefined) return []

  return [
    {
      addressNList: [
        0x80000000 + 44,
        0x80000000 + slip44,
        0x80000000 + msg.accountIdx,
        0x80000000 + 0,
        0x80000000 + 0,
      ],
    },
  ]
}

export function aptosNextAccountPath(msg: AptosAccountPath): AptosAccountPath | undefined {
  const description = aptosDescribePath(msg.addressNList)
  if (!description.isKnown || description.accountIdx === undefined) return

  return aptosGetAccountPaths({ accountIdx: description.accountIdx + 1 })[0]
}
