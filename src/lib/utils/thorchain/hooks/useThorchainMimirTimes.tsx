import { thorchainChainId } from '@shapeshiftoss/caip'

import { selectLiquidityLockupTime, selectRunePoolMaturityTime } from '../selectors'
import { useThorchainMimir } from './useThorchainMimir'

export const useThorchainMimirTimes = () => {
  return useThorchainMimir({
    chainId: thorchainChainId,
    select: mimir => ({
      liquidityLockupTime: selectLiquidityLockupTime(mimir),
      runePoolDepositMaturityTime: selectRunePoolMaturityTime(mimir),
    }),
  })
}
