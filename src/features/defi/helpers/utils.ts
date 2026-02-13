import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import { cosmosChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'

import { bnOrZero } from '@/lib/bignumber/bignumber'
import { selectPortfolioCryptoBalanceByFilter } from '@/state/slices/selectors'
import { store } from '@/state/store'

export const chainIdToLabel = (chainId: ChainId): string => {
  switch (chainId) {
    case cosmosChainId:
      return 'Cosmos'
    default: {
      return ''
    }
  }
}

export const canCoverTxFees = ({
  feeAsset,
  estimatedGasCryptoPrecision,
  accountId,
}: {
  feeAsset: Asset
  estimatedGasCryptoPrecision: string
  accountId: AccountId
}) => {
  const state = store.getState()
  const feeAssetBalanceCryptoHuman = selectPortfolioCryptoBalanceByFilter(state, {
    accountId,
    assetId: feeAsset.assetId,
  }).toPrecision()

  return bnOrZero(feeAssetBalanceCryptoHuman).minus(bnOrZero(estimatedGasCryptoPrecision)).gte(0)
}
