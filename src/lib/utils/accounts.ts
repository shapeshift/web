import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { accountIdToChainId, fromAccountId } from '@shapeshiftoss/caip'
import type { Asset, PartialRecord } from '@shapeshiftoss/types'

import { firstFourLastFour } from '.'
import { isUtxoAccountId } from './utxo'

import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'

export const getAccountTitle = (accountId: AccountId, assets: PartialRecord<AssetId, Asset>) => {
  const isUtxoAccount = isUtxoAccountId(accountId)
  const feeAssetId = accountIdToFeeAssetId(accountId ?? '') ?? ''
  return isUtxoAccount
    ? assets[feeAssetId]?.name ?? ''
    : firstFourLastFour(fromAccountId(accountId).account)
}

export const accountIdToFeeAssetId = (accountId: AccountId): AssetId | undefined =>
  getChainAdapterManager().get(accountIdToChainId(accountId))?.getFeeAssetId()

export const accountIdToChainDisplayName = (accountId: AccountId): AssetId | undefined =>
  getChainAdapterManager().get(accountIdToChainId(accountId))?.getDisplayName()

// 0 is valid but falsy, dum language
export const isValidAccountNumber = (
  accountNumber: number | undefined | null,
): accountNumber is number => {
  if (accountNumber === undefined) return false
  if (accountNumber === null) return false
  return Number.isInteger(accountNumber) && accountNumber >= 0
}
