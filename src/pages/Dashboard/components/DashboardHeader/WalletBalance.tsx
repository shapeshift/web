import type { FlexProps } from '@chakra-ui/react'
import { Flex, Skeleton } from '@chakra-ui/react'
import type { ResponsiveValue } from '@chakra-ui/system'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import type { Property } from 'csstype'
import { memo, useMemo } from 'react'
import { Amount } from 'components/Amount/Amount'
import { useFetchOpportunities } from 'components/StakingVaults/hooks/useFetchOpportunities'
import { Text } from 'components/Text'
import {
  selectClaimableRewards,
  selectEarnBalancesUserCurrencyAmountFull,
  selectIsPortfolioLoading,
  selectPortfolioTotalUserCurrencyBalanceExcludeEarnDupes,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

const balanceFontSize = { base: '2xl', md: '4xl' }
const balanceFlexDir: ResponsiveValue<Property.FlexDirection> = {
  base: 'column-reverse',
  md: 'column',
}
const portfolioTextAlignment: ResponsiveValue<Property.AlignItems> = {
  base: 'center',
  md: 'flex-start',
}

type WalletBalanceProps = {
  label?: string
  alignItems?: FlexProps['alignItems']
}
export const WalletBalance: React.FC<WalletBalanceProps> = memo(
  ({ label = 'defi.netWorth', alignItems }) => {
    const { isLoading: isOpportunitiesLoading } = useFetchOpportunities()
    const isPortfolioLoading = useAppSelector(selectIsPortfolioLoading)
    const claimableRewardsUserCurrencyBalanceFilter = useMemo(() => ({}), [])
    const claimableRewardsUserCurrencyBalance = useAppSelector(state =>
      selectClaimableRewards(state, claimableRewardsUserCurrencyBalanceFilter),
    )
    const earnUserCurrencyBalance = useAppSelector(
      selectEarnBalancesUserCurrencyAmountFull,
    ).toFixed()
    const portfolioTotalUserCurrencyBalance = useAppSelector(
      selectPortfolioTotalUserCurrencyBalanceExcludeEarnDupes,
    )
    const netWorth = useMemo(
      () =>
        bnOrZero(earnUserCurrencyBalance)
          .plus(portfolioTotalUserCurrencyBalance)
          .plus(claimableRewardsUserCurrencyBalance)
          .toFixed(),
      [
        claimableRewardsUserCurrencyBalance,
        earnUserCurrencyBalance,
        portfolioTotalUserCurrencyBalance,
      ],
    )
    return (
      <Flex flexDir={balanceFlexDir} alignItems={alignItems ?? portfolioTextAlignment}>
        <Text fontWeight='medium' translation={label} color='text.subtle' />
        <Skeleton isLoaded={!isPortfolioLoading && !isOpportunitiesLoading}>
          <Amount.Fiat
            lineHeight='shorter'
            value={netWorth}
            fontSize={balanceFontSize}
            fontWeight='semibold'
          />
        </Skeleton>
      </Flex>
    )
  },
)
