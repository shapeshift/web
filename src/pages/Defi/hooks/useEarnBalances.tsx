import { bnOrZero } from 'lib/bignumber/bignumber'

import { useVaultBalances, UseVaultBalancesReturn } from './useVaultBalances'

export type UseEarnBalancesReturn = {
  vaults: UseVaultBalancesReturn
  totalEarningBalance: string
}

export function useEarnBalances(): UseEarnBalancesReturn {
  const vaults = useVaultBalances()
  // When staking, farming, lp, etc are added sum up the balances here
  const totalEarningBalance = bnOrZero(vaults?.totalBalance).toString()
  return { vaults, totalEarningBalance }
}
