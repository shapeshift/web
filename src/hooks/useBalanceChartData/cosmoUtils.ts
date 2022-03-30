/* eslint-disable no-console */
import { AssetNamespace, AssetReference, caip19 } from '@shapeshiftoss/caip'
import { ChainTypes, NetworkTypes } from '@shapeshiftoss/types'
import BigNumber from 'bignumber.js'
import { PriceHistoryData } from 'state/slices/marketDataSlice/marketDataSlice'
import { PortfolioAssets } from 'state/slices/portfolioSlice/portfolioSlice'
import { Tx } from 'state/slices/txHistorySlice/txHistorySlice'

import { Bucket, BucketBalance } from './useBalanceChartData'

export const skipCosmosTx = (tx: Tx) =>
  tx.data?.parser === 'cosmos' &&
  (tx?.data.method === 'delegate' || tx?.data.method === 'begin_unbonding')

export const firstBucketWithStakedBalance = (
  bucket: Bucket,
  priceHistoryData: PriceHistoryData,
  portfolioAssets: PortfolioAssets
): Bucket => {
  const startingBucket = { ...bucket }
  const startingBucketBalance: BucketBalance = startingBucket.balance

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

  startingBucketBalance.crypto[cosmosCaip19] = startingBucketBalance.crypto[cosmosCaip19]
    ? startingBucketBalance.crypto[cosmosCaip19].plus(totalCosmosStaked)
    : new BigNumber(totalCosmosStaked)

  // startingBucket.balance.fiat = fiatBalanceAtBucket({
  //   bucket: startingBucket,
  //   priceHistoryData,
  //   portfolioAssets
  // })

  console.log('returning startingBucket', startingBucket)

  return startingBucket
}
