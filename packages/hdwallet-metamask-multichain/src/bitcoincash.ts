import type * as core from '@shapeshiftoss/hdwallet-core'
import {
  BCHGetAddress as snapBitcoinCashGetAddress,
  BCHGetPublicKeys as snapBitcoinCashGetPublicKeys,
  BCHSignTransaction as snapBitcoinCashSignTransaction,
} from '@shapeshiftoss/metamask-snaps-adapter'
import type {
  BitcoinCashGetAddressResponse,
  BitcoinGetPublicKeysResponse,
} from '@shapeshiftoss/metamask-snaps-types'

import { SNAP_ID } from './common'

export async function bitcoinCashGetAddress(
  msg: core.BTCGetAddress,
): Promise<BitcoinCashGetAddressResponse> {
  return await snapBitcoinCashGetAddress({ snapId: SNAP_ID, addressParams: msg })
}

export async function bitcoinCashGetPublicKeys(
  msg: core.BTCGetAddress,
): Promise<BitcoinGetPublicKeysResponse> {
  return await snapBitcoinCashGetPublicKeys({ snapId: SNAP_ID, addressParams: msg })
}

export async function bitcoinCashSignTx(msg: core.BTCSignTx): Promise<core.BTCSignedTx | null> {
  return await snapBitcoinCashSignTransaction({ snapId: SNAP_ID, transaction: msg })
}
