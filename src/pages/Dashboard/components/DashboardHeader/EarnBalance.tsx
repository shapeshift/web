import { Skeleton } from '@chakra-ui/react'
import { Amount } from 'components/Amount/Amount'
import { useFetchOpportunities } from 'components/StakingVaults/hooks/useFetchOpportunities'
import { selectEarnBalancesUserCurrencyAmountFull } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export const EarnBalance = () => {
  const isOpportunitiesLoading = useFetchOpportunities()
  const earnUserCurrencyBalance = useAppSelector(selectEarnBalancesUserCurrencyAmountFull).toFixed()
  return (
    <Skeleton isLoaded={!isOpportunitiesLoading}>
      <Amount.Fiat value={earnUserCurrencyBalance} />
    </Skeleton>
  )
}
