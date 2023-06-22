import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import { cosmosChainId, osmosisChainId } from '@shapeshiftoss/caip'
import type { Asset } from 'lib/asset-service'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { selectPortfolioCryptoPrecisionBalanceByFilter } from 'state/slices/selectors'
import { store } from 'state/store'

export const chainIdToLabel = (chainId: ChainId): string => {
  switch (chainId) {
    case cosmosChainId:
      return 'Cosmos'
    case osmosisChainId:
      return 'Osmosis'
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
  const feeAssetBalanceCryptoHuman = selectPortfolioCryptoPrecisionBalanceByFilter(state, {
    accountId,
    assetId: feeAsset.assetId,
  })

  return bnOrZero(feeAssetBalanceCryptoHuman).minus(bnOrZero(estimatedGasCryptoPrecision)).gte(0)
}
