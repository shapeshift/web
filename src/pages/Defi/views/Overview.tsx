import { Box, Divider, Heading, Stack } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { Route } from 'Routes/helpers'
import { Main } from 'components/Layout/Main'
import { selectPortfolioTotalFiatBalance } from 'state/slices/selectors'

import { OverviewHeader } from '../components/OverviewHeader'
import { VaultList } from '../components/VaultList'
import { useEarnBalances } from '../hooks/useEarnBalances'

const DefiHeader = () => {
  const translate = useTranslate()
  return (
    <Box>
      <Heading>{translate('defi.defi')}</Heading>
    </Box>
  )
}

export const Overview = ({ route }: { route?: Route }) => {
  const balances = useEarnBalances()
  const walletBalance = useSelector(selectPortfolioTotalFiatBalance)
  return (
    <Main titleComponent={<DefiHeader />} route={route}>
      <OverviewHeader earnBalance={balances} walletBalance={walletBalance} />
      <Stack spacing={4} divider={<Divider marginTop={0} />}>
        <VaultList balances={balances} />
      </Stack>
    </Main>
  )
}
