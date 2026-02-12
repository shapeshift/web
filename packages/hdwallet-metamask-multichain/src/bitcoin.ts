import type * as core from '@shapeshiftoss/hdwallet-core'
import {
  BTCGetAddress as snapBitcoinGetAddress,
  BTCGetPublicKeys as snapBitcoinGetPublicKeys,
  BTCSignTransaction as snapBitcoinSignTransaction,
} from '@shapeshiftoss/metamask-snaps-adapter'
import type {
  BitcoinGetAddressResponse,
  BitcoinGetPublicKeysResponse,
} from '@shapeshiftoss/metamask-snaps-types'

import { SNAP_ID } from './common'
import { utxoGetAccountPaths } from './utxo'

export function bitcoinGetAccountPaths(msg: core.BTCGetAccountPaths): core.BTCAccountPath[] {
  return utxoGetAccountPaths(msg)
}

export function bitcoinNextAccountPath(_msg: core.BTCAccountPath): core.BTCAccountPath | undefined {
  // Only support one account for now (like portis).
  return undefined
}

export async function bitcoinGetPublicKeys(
  msg: core.BTCGetAddress,
): Promise<BitcoinGetPublicKeysResponse> {
  return await snapBitcoinGetPublicKeys({ snapId: SNAP_ID, addressParams: msg })
}

export async function bitcoinGetAddress(
  msg: core.BTCGetAddress,
): Promise<BitcoinGetAddressResponse> {
  return await snapBitcoinGetAddress({ snapId: SNAP_ID, addressParams: msg })
}

export async function bitcoinSignTx(msg: core.BTCSignTx): Promise<core.BTCSignedTx | null> {
  return await snapBitcoinSignTransaction({ snapId: SNAP_ID, transaction: msg })
}
