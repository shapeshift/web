import { Divider, Stack } from '@chakra-ui/react'
import { Main } from 'components/Layout/Main'

import { OverviewHeader } from '../components/OverviewHeader'
import { VaultList } from '../components/VaultList'
import { useEarnBalances } from '../hooks/useEarnBalances'

export const Overview = () => {
  const balances = useEarnBalances()
  return (
    <Main>
      <Stack spacing={4} divider={<Divider marginTop={0} />}>
        <OverviewHeader balances={balances} />
        <VaultList balances={balances} />
      </Stack>
    </Main>
  )
}
