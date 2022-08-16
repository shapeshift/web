import { bnOrZero } from 'lib/bignumber/bignumber'

import { useFoxEthLpBalances } from './useFoxEthLpBalances'
import { useFoxFarmingBalances } from './useFoxFarmingBalances'

export type useLpHoldingBalanceReturn = {
  lpHoldingsBalance: string
}

export function useLpHoldingBalance(): useLpHoldingBalanceReturn {
  const { opportunity: foxEthLpOpportunity } = useFoxEthLpBalances()
  const { totalBalance: foxFarmingTotalBalance } = useFoxFarmingBalances()

  // this should remain for the correct "netWorth" no matter what flags status are
  const lpHoldingsBalance = bnOrZero(foxEthLpOpportunity.fiatAmount).plus(foxFarmingTotalBalance)

  return {
    lpHoldingsBalance: lpHoldingsBalance.toString(),
  }
}
