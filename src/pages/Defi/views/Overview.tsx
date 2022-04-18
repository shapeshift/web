import { Box, Divider, Heading, Stack } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { Main } from 'components/Layout/Main'
import { selectPortfolioTotalFiatBalanceWithDelegations } from 'state/slices/selectors'

import { OpportunityCardList } from '../components/OpportunityCardList'
import { OverviewHeader } from '../components/OverviewHeader'
import { useEarnBalances } from '../hooks/useEarnBalances'

const DefiHeader = () => {
  const translate = useTranslate()
  return (
    <Box>
      <Heading>{translate('defi.defi')}</Heading>
    </Box>
  )
}

export const Overview = () => {
  const balances = useEarnBalances()
  const walletBalance = useSelector(selectPortfolioTotalFiatBalanceWithDelegations)
  return (
    <Main titleComponent={<DefiHeader />}>
      <OverviewHeader earnBalance={balances} walletBalance={walletBalance} />
      <Stack spacing={4} divider={<Divider marginTop={0} />}>
        <OpportunityCardList balances={balances} />
      </Stack>
    </Main>
  )
}
