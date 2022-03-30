import { AssetNamespace, AssetReference, caip19 } from '@shapeshiftoss/caip'
import { ChainTypes, NetworkTypes } from '@shapeshiftoss/types'
import { BigNumber } from 'bignumber.js'
import { Tx } from 'state/slices/txHistorySlice/txHistorySlice'

import { Bucket } from './useBalanceChartData'

export const skipCosmosTx = (tx: Tx) =>
  tx.data?.parser === 'cosmos' &&
  (tx?.data.method === 'delegate' || tx?.data.method === 'begin_unbonding')

export const includeStakedBalance = (startingBucket: Bucket) => {
  const newStartingBucket = { ...startingBucket }
  // TODO:
  // when this PR is merged: https://github.com/shapeshift/web/pull/1331
  // We can get cosmos delegations from state and aggregate them here
  const totalCosmosStaked = 400000

  // TODO how can we dynamically do this for all cosmos sdk coins?
  const cosmosCaip19 = caip19.toCAIP19({
    chain: ChainTypes.Cosmos,
    network: NetworkTypes.COSMOSHUB_MAINNET,
    assetNamespace: AssetNamespace.Slip44,
    assetReference: AssetReference.Cosmos
  })

  newStartingBucket.balance.crypto[cosmosCaip19] = newStartingBucket.balance.crypto[cosmosCaip19]
    ? newStartingBucket.balance.crypto[cosmosCaip19].plus(totalCosmosStaked)
    : new BigNumber(totalCosmosStaked)

  return newStartingBucket
}
