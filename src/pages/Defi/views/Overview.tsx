import { Divider, Stack } from '@chakra-ui/react'
import { useSelector } from 'react-redux'
import { Main } from 'components/Layout/Main'
import { selectPortfolioTotalFiatBalance } from 'state/slices/portfolioSlice/portfolioSlice'

import { OverviewHeader } from '../components/OverviewHeader'
import { VaultList } from '../components/VaultList'
import { useEarnBalances } from '../hooks/useEarnBalances'

export const Overview = () => {
  const balances = useEarnBalances()
  const walletBalance = useSelector(selectPortfolioTotalFiatBalance)
  return (
    <Main>
      <OverviewHeader earnBalance={balances} walletBalance={walletBalance} />
      <Stack spacing={4} divider={<Divider marginTop={0} />}>
        <VaultList balances={balances} />
      </Stack>
    </Main>
  )
}
