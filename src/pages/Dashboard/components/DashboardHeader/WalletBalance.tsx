import type { FlexProps, ResponsiveValue } from '@chakra-ui/react'
import { Box, Flex, Spinner } from '@chakra-ui/react'
import type { Property } from 'csstype'
import { memo } from 'react'
import { useTranslate } from 'react-polyglot'

import { Amount } from '@/components/Amount/Amount'
import { Text } from '@/components/Text'
import { TooltipWithTouch } from '@/components/TooltipWithTouch'
import { useDiscoverAccounts } from '@/context/AppProvider/hooks/useDiscoverAccounts'
import {
  selectIsAnyPortfolioGetAccountLoading,
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
    const { isFetching: isDiscoveringAccounts } = useDiscoverAccounts()
    const portfolioTotalUserCurrencyBalance = useAppSelector(
      selectPortfolioTotalUserCurrencyBalance,
    )
    const isAnyPortfolioGetAccountLoading = useAppSelector(selectIsAnyPortfolioGetAccountLoading)

    const walletAccounts = useAppSelector(selectPortfolioAccounts)

    const translate = useTranslate()

    return (
      <Flex flexDir={balanceFlexDir} alignItems={alignItems ?? portfolioTextAlignment}>
        <Box position='relative'>
          <Text fontWeight='medium' translation={label} color='text.subtle' whiteSpace='nowrap' />

          {(isDiscoveringAccounts || isAnyPortfolioGetAccountLoading) && (
            <TooltipWithTouch
              label={translate('defi.loadingAccounts', {
                portfolioAccountsLoaded: Object.keys(walletAccounts).length,
              })}
              position='absolute'
              right={-8}
              top={1}
            >
              <Spinner color='blue.500' size='sm' />
            </TooltipWithTouch>
          )}
        </Box>
        <Amount.Fiat
          lineHeight='shorter'
          value={portfolioTotalUserCurrencyBalance}
          fontSize={balanceFontSize ?? defaultBalanceFontSize}
          fontWeight='semibold'
        />
      </Flex>
    )
  },
)
