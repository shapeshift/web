import type { FlexProps, ResponsiveValue } from '@chakra-ui/react'
import { Box, Flex, Spinner } from '@chakra-ui/react'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import type { Property } from 'csstype'
import { memo, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { Amount } from '@/components/Amount/Amount'
import { useFetchOpportunities } from '@/components/StakingVaults/hooks/useFetchOpportunities'
import { Text } from '@/components/Text'
import { TooltipWithTouch } from '@/components/TooltipWithTouch'
import { useAccountsFetchQuery } from '@/context/AppProvider/hooks/useAccountsFetchQuery'
import {
  selectClaimableRewards,
  selectEarnBalancesUserCurrencyAmountFull,
  selectPortfolioAccounts,
  selectPortfolioTotalUserCurrencyBalance,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const defaultBalanceFontSize = { base: '2xl', md: '4xl' }
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
  balanceFontSize?: FlexProps['fontSize']
}
export const WalletBalance: React.FC<WalletBalanceProps> = memo(
  ({ label = 'defi.netWorth', alignItems, balanceFontSize }) => {
    const { isFetching: isAccountsMetadataFetching } = useAccountsFetchQuery()
    const { isLoading: isOpportunitiesLoading, opportunityAccountIdsFetched } =
      useFetchOpportunities()
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

    const walletAccounts = useAppSelector(selectPortfolioAccounts)

    const walletOpportunityAccountIds = useMemo(
      () => opportunityAccountIdsFetched.filter(id => walletAccounts[id] !== undefined),
      [opportunityAccountIdsFetched, walletAccounts],
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
        <Box position='relative'>
          <Text fontWeight='medium' translation={label} color='text.subtle' whiteSpace='nowrap' />

          {(isOpportunitiesLoading || isAccountsMetadataFetching) && (
            <TooltipWithTouch
              label={translate('defi.loadingAccounts', {
                portfolioAccountsLoaded: Object.keys(walletAccounts).length,
                opportunityAccountsLoaded: walletOpportunityAccountIds.length,
              })}
            >
              <Spinner color='blue.500' size='sm' position='absolute' right={-8} top={1} />
            </TooltipWithTouch>
          )}
        </Box>
        <Amount.Fiat
          lineHeight='shorter'
          value={netWorth}
          fontSize={balanceFontSize ?? defaultBalanceFontSize}
          fontWeight='semibold'
        />
      </Flex>
    )
  },
)
