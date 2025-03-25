import { Skeleton } from '@chakra-ui/react'
import { useMemo } from 'react'

import { Amount } from '@/components/Amount/Amount'
import { useFetchOpportunities } from '@/components/StakingVaults/hooks/useFetchOpportunities'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import {
  selectClaimableRewards,
  selectEarnBalancesUserCurrencyAmountFull,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export const EarnBalance = () => {
  const { isLoading: isOpportunitiesLoading } = useFetchOpportunities()
  const earnUserCurrencyBalance = useAppSelector(selectEarnBalancesUserCurrencyAmountFull).toFixed()

  const claimableRewardsUserCurrencyBalanceFilter = useMemo(() => ({}), [])
  const claimableRewardsUserCurrencyBalance = useAppSelector(state =>
    selectClaimableRewards(state, claimableRewardsUserCurrencyBalanceFilter),
  )

  const earnBalance = useMemo(
    () => bnOrZero(earnUserCurrencyBalance).plus(claimableRewardsUserCurrencyBalance).toFixed(),
    [claimableRewardsUserCurrencyBalance, earnUserCurrencyBalance],
  )

  return (
    <Skeleton isLoaded={!isOpportunitiesLoading}>
      <Amount.Fiat value={earnBalance} />
    </Skeleton>
  )
}
