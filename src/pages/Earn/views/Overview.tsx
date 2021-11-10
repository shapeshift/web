import { Divider, Stack } from '@chakra-ui/react'
import { Main } from 'components/Layout/Main'

import { OverviewHeader } from '../components/OverviewHeader'
import { VaultList } from '../components/VaultList'

export const Overview = () => {
  return (
    <Main>
      <Stack spacing={4} divider={<Divider marginTop={0} />}>
        <OverviewHeader />
        <VaultList />
      </Stack>
    </Main>
  )
}
