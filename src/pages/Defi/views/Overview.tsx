import { Box, Divider, Heading, Stack } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { Main } from 'components/Layout/Main'
import { SEO } from 'components/Layout/Seo'
import { selectPortfolioTotalFiatBalanceIncludingStaking } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { OpportunityCardList } from '../components/OpportunityCardList'
import { OverviewHeader } from '../components/OverviewHeader'
import { useEarnBalances } from '../hooks/useEarnBalances'

const DefiHeader = () => {
  const translate = useTranslate()
  return (
    <Box>
      <SEO title={translate('defi.defi')} />
      <Heading>{translate('defi.defi')}</Heading>
    </Box>
  )
}

export const Overview = () => {
  const balances = useEarnBalances()
  const netWorth = useAppSelector(selectPortfolioTotalFiatBalanceIncludingStaking)
  return (
    <Main titleComponent={<DefiHeader />}>
      <OverviewHeader earnBalance={balances} netWorth={netWorth} />
      <Stack spacing={4} divider={<Divider marginTop={0} />}>
        <OpportunityCardList balances={balances} />
      </Stack>
    </Main>
  )
}
