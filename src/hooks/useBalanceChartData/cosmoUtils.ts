import { BigNumber } from 'bignumber.js'
import { Tx } from 'state/slices/txHistorySlice/txHistorySlice'

import { Bucket } from './useBalanceChartData'

export const skipCosmosTx = (tx: Tx) =>
  tx.data?.parser === 'cosmos' &&
  (tx?.data.method === 'delegate' || tx?.data.method === 'begin_unbonding')

export const includeStakedBalance = (startingBucket: Bucket) => {
  const sb = { ...startingBucket }
  // TODO:
  // when this PR is merged: https://github.com/shapeshift/web/pull/1331
  // We can get cosmos delegations from state and aggregate them here
  const totalCosmosStaked = 400000

  // TODO how can we dynamically do this for all cosmos sdk coins?
  const cosmosCaip19 = 'cosmos:cosmoshub-4/slip44:118'

  sb.balance.crypto[cosmosCaip19] = sb.balance.crypto[cosmosCaip19]
    ? sb.balance.crypto[cosmosCaip19].plus(totalCosmosStaked)
    : new BigNumber(totalCosmosStaked)

  return sb
}
