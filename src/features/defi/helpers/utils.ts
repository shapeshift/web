import type { Asset } from '@shapeshiftoss/asset-service'
import type { ChainId } from '@shapeshiftoss/caip'
import { cosmosChainId, osmosisChainId } from '@shapeshiftoss/caip'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { selectPortfolioCryptoHumanBalanceByAssetId } from 'state/slices/selectors'
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

export const makeHasEnoughBalanceForGas = (
  feeAsset: Asset,
  estimatedGasCrypto?: string | undefined,
) => {
  const state = store.getState()
  const feeAssetBalance = selectPortfolioCryptoHumanBalanceByAssetId(state, {
    assetId: feeAsset?.assetId ?? '',
  })

  return bnOrZero(feeAssetBalance)
    .minus(bnOrZero(estimatedGasCrypto).div(`1e+${feeAsset.precision}`))
    .gte(0)
}
