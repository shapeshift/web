import { AssetNamespace, AssetReference, toAssetId } from '@shapeshiftoss/caip'
import { ChainTypes, NetworkTypes } from '@shapeshiftoss/types'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { Tx } from 'state/slices/txHistorySlice/txHistorySlice'

import { Bucket } from './useBalanceChartData'

const cosmosAssetId = toAssetId({
  chain: ChainTypes.Cosmos,
  network: NetworkTypes.COSMOSHUB_MAINNET,
  assetNamespace: AssetNamespace.Slip44,
  assetReference: AssetReference.Cosmos,
})

export const includeTransaction = (tx: Tx): boolean =>
  tx.data?.parser !== 'cosmos' ||
  !(tx?.data.method === 'delegate' || tx?.data.method === 'begin_unbonding')

export const includeStakedBalance = (
  startingBucket: Bucket,
  totalCosmosStaked: string,
  assetIds: string[],
) => {
  const newStartingBucket = { ...startingBucket }

  if (assetIds.includes(cosmosAssetId)) {
    newStartingBucket.balance.crypto[cosmosAssetId] = newStartingBucket.balance.crypto[
      cosmosAssetId
    ]
      ? newStartingBucket.balance.crypto[cosmosAssetId].plus(totalCosmosStaked)
      : bnOrZero(totalCosmosStaked)
  }
  return newStartingBucket
}
