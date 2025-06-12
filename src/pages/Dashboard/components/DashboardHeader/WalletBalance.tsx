import type { FlexProps, ResponsiveValue } from '@chakra-ui/react'
import { Flex, Spinner } from '@chakra-ui/react'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import type { Property } from 'csstype'
import { memo, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { Amount } from '@/components/Amount/Amount'
import { useFetchOpportunities } from '@/components/StakingVaults/hooks/useFetchOpportunities'
import { Text } from '@/components/Text'
import { TooltipWithTouch } from '@/components/TooltipWithTouch'
import {
  selectClaimableRewards,
  selectEarnBalancesUserCurrencyAmountFull,
  selectIsPortfolioLoading,
  selectPortfolioTotalUserCurrencyBalance,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

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
    const { isLoading: isOpportunitiesLoading, progress } = useFetchOpportunities()
    const isPortfolioLoading = useAppSelector(selectIsPortfolioLoading)
    const claimableRewardsUserCurrencyBalanceFilter = useMemo(() => ({}), [])
    const claimableRewardsUserCurrencyBalance = useAppSelector(state =>
      selectClaimableRewards(state, claimableRewardsUserCurrencyBalanceFilter),
    )
    const earnUserCurrencyBalance = useAppSelector(
      selectEarnBalancesUserCurrencyAmountFull,
    ).toFixed()
    const portfolioTotalUserCurrencyBalance = useAppSelector(
      selectPortfolioTotalUserCurrencyBalance,
    )

    const translate = useTranslate()

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
        <Flex gap={2}>
          <Text fontWeight='medium' translation={label} color='text.subtle' />

          {(isOpportunitiesLoading || isPortfolioLoading) && (
            <TooltipWithTouch
              label={
                isOpportunitiesLoading
                  ? translate('defi.loadingWalletChains', progress)
                  : translate('defi.loadingPortfolio')
              }
            >
              <Spinner color='blue.500' size='sm' />
            </TooltipWithTouch>
          )}
        </Flex>
        <Amount.Fiat
          lineHeight='shorter'
          value={netWorth}
          fontSize={balanceFontSize}
          fontWeight='semibold'
        />
      </Flex>
    )
  },
)
