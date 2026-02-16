import type * as core from '@shapeshiftoss/hdwallet-core'
import {
  dogecoinGetAddress as snapDogecoinGetAddress,
  dogecoinGetPublicKeys as snapDogecoinGetPublicKeys,
  dogecoinSignTransaction as snapDogecoinSignTransaction,
} from '@shapeshiftoss/metamask-snaps-adapter'
import type {
  BitcoinGetPublicKeysResponse,
  DogecoinGetAddressResponse,
} from '@shapeshiftoss/metamask-snaps-types'

import { SNAP_ID } from './common'
import { utxoGetAccountPaths } from './utxo'

export function dogecoinGetAccountPaths(msg: core.BTCGetAccountPaths): core.BTCAccountPath[] {
  return utxoGetAccountPaths(msg)
}

export function dogecoinNextAccountPath(
  _msg: core.BTCAccountPath,
): core.BTCAccountPath | undefined {
  // Only support one account for now (like portis).
  return undefined
}

export async function dogecoinGetAddress(
  msg: core.BTCGetAddress,
): Promise<DogecoinGetAddressResponse> {
  return await snapDogecoinGetAddress({ snapId: SNAP_ID, addressParams: msg })
}

export async function dogecoinGetPublicKeys(
  msg: core.BTCGetAddress,
): Promise<BitcoinGetPublicKeysResponse> {
  return await snapDogecoinGetPublicKeys({ snapId: SNAP_ID, addressParams: msg })
}

export async function dogecoinSignTx(msg: core.BTCSignTx): Promise<core.BTCSignedTx | null> {
  return await snapDogecoinSignTransaction({ snapId: SNAP_ID, transaction: msg })
}
