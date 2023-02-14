import { Box, Divider, Heading, Stack } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { Main } from 'components/Layout/Main'
import { SEO } from 'components/Layout/Seo'
import {
  selectEarnBalancesFiatAmountFull,
  selectPortfolioTotalFiatBalanceExcludeEarnDupes,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { OpportunityCardList } from '../components/OpportunityCardList'
import { OverviewHeader } from '../components/OverviewHeader'

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
  const earnBalance = useAppSelector(selectEarnBalancesFiatAmountFull).toFixed()
  const portfolioTotalFiatBalance = useAppSelector(selectPortfolioTotalFiatBalanceExcludeEarnDupes)
  return (
    <Main titleComponent={<DefiHeader />}>
      <OverviewHeader earnBalance={earnBalance} portfolioBalance={portfolioTotalFiatBalance} />
      <Stack spacing={4} divider={<Divider marginTop={0} />}>
        <OpportunityCardList />
      </Stack>
    </Main>
  )
}
