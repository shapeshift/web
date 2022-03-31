import { AssetNamespace, AssetReference, caip19 } from '@shapeshiftoss/caip'
import { ChainTypes, NetworkTypes } from '@shapeshiftoss/types'
import { BigNumber } from 'bignumber.js'
import { Tx } from 'state/slices/txHistorySlice/txHistorySlice'

import { Bucket } from './useBalanceChartData'

export const skipCosmosTx = (tx: Tx) =>
  tx.data?.parser === 'cosmos' &&
  (tx?.data.method === 'delegate' || tx?.data.method === 'begin_unbonding')

export const includeStakedBalance = (
  startingBucket: Bucket,
  totalCosmosStaked: number,
  assetIds: string[]
) => {
  const newStartingBucket = { ...startingBucket }

  const cosmosCaip19 = caip19.toCAIP19({
    chain: ChainTypes.Cosmos,
    network: NetworkTypes.COSMOSHUB_MAINNET,
    assetNamespace: AssetNamespace.Slip44,
    assetReference: AssetReference.Cosmos
  })

  if (assetIds.includes(cosmosCaip19)) {
    newStartingBucket.balance.crypto[cosmosCaip19] = newStartingBucket.balance.crypto[cosmosCaip19]
      ? newStartingBucket.balance.crypto[cosmosCaip19].plus(totalCosmosStaked)
      : new BigNumber(totalCosmosStaked)
  }
  return newStartingBucket
}
