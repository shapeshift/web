import { Flex, Heading, Skeleton } from '@chakra-ui/react'

import { ErroredTxHistoryAccounts } from './ErroredTxHistoryAccounts'

import { Amount } from '@/components/Amount/Amount'
import { Text } from '@/components/Text'
import {
  selectIsPortfolioLoading,
  selectPortfolioTotalUserCurrencyBalance,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const displayMdFlex = { base: 'none', md: 'flex' }

export const DashboardBalance = () => {
  const portfolioTotalUserCurrencyBalance = useAppSelector(selectPortfolioTotalUserCurrencyBalance)
  const loading = useAppSelector(selectIsPortfolioLoading)
  const isLoaded = !loading

  return (
    <Flex flexDir='column' justifyContent='center' alignItems='center' display={displayMdFlex}>
      <Heading as='div' color='text.subtle'>
        <Skeleton isLoaded={isLoaded}>
          <Text translation='defi.walletBalance' />
        </Skeleton>
      </Heading>
      <Flex>
        <Heading as='h2' fontSize='4xl' lineHeight='1' mr={2}>
          <Skeleton isLoaded={isLoaded}>
            <Amount.Fiat value={portfolioTotalUserCurrencyBalance} />
          </Skeleton>
        </Heading>
        <ErroredTxHistoryAccounts />
      </Flex>
    </Flex>
  )
}
