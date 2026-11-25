import type * as core from '@shapeshiftoss/hdwallet-core'
import {
  LTCGetAddress as snapLitecoinGetAddress,
  LTCGetPublicKeys as snapLitecoinGetPublicKeys,
  LTCSignTransaction as snapLitecoinSignTransaction,
} from '@shapeshiftoss/metamask-snaps-adapter'
import type {
  BitcoinGetPublicKeysResponse,
  LitecoinGetAddressResponse,
} from '@shapeshiftoss/metamask-snaps-types'

import { SNAP_ID } from './common'

export async function litecoinGetAddress(
  msg: core.BTCGetAddress,
): Promise<LitecoinGetAddressResponse> {
  return await snapLitecoinGetAddress({ snapId: SNAP_ID, addressParams: msg })
}
export async function litecoinGetPublicKeys(
  msg: core.BTCGetAddress,
): Promise<BitcoinGetPublicKeysResponse> {
  return await snapLitecoinGetPublicKeys({ snapId: SNAP_ID, addressParams: msg })
}

export async function litecoinSignTx(msg: core.BTCSignTx): Promise<core.BTCSignedTx | null> {
  return await snapLitecoinSignTransaction({ snapId: SNAP_ID, transaction: msg })
}
