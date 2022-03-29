import { Tx } from 'state/slices/txHistorySlice/txHistorySlice'

import { BucketBalance } from './useBalanceChartData'

export const skipCosmosTx = (tx: Tx) =>
  tx.data?.parser === 'cosmos' &&
  (tx?.data.method === 'delegate' || tx?.data.method === 'begin_unbonding')

export const includeStakedBalance = (startingBucketBalance: BucketBalance) => {
  // TODO:
  // when this PR is merged: https://github.com/shapeshift/web/pull/1331
  // We can get cosmos delegations from state and aggregate them here
  const totalCosmosStaked = 0

  // TODO how can we dynamically do this for all cosmos sdk coins?
  const cosmosCaip19 = 'cosmos:cosmoshub-4/slip44:118'

  startingBucketBalance.crypto['cosmos:cosmoshub-4/slip44:118'] =
    startingBucketBalance.crypto[cosmosCaip19].plus(totalCosmosStaked)
}
