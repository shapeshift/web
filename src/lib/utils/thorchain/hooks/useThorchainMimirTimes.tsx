import type { ChainId } from '@shapeshiftoss/caip'

import { selectLiquidityLockupTime, selectRunePoolMaturityTime } from '../selectors'
import { useThorchainMimir } from './useThorchainMimir'

export const useThorchainMimirTimes = (chainId: ChainId) => {
  return useThorchainMimir({
    chainId,
    select: mimir => ({
      liquidityLockupTime: selectLiquidityLockupTime(mimir),
      runePoolDepositMaturityTime: selectRunePoolMaturityTime(mimir),
    }),
  })
}
