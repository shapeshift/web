import { selectLiquidityLockupTime, selectRunePoolMaturityTime } from '../selectors'
import { useThorchainMimir } from './useThorchainMimir'

export const useThorchainMimirTimes = () => {
  return useThorchainMimir({
    select: mimir => ({
      liquidityLockupTime: selectLiquidityLockupTime(mimir),
      runePoolDepositMaturityTime: selectRunePoolMaturityTime(mimir),
    }),
  })
}
