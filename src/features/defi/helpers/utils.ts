import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import { cosmosChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'

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
  })

  return feeAssetBalanceCryptoHuman.minus(estimatedGasCryptoPrecision).gte(0)
}
