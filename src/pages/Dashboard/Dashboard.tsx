import { Stack } from '@chakra-ui/react'
import { Route } from 'Routes/helpers'
import { Main } from 'components/Layout/Main'

import { DashboardSidebar } from './DashboardSidebar'
import { Portfolio } from './Portfolio'

export type MatchParams = {
  assetId: string
}

export const Dashboard = ({ route }: { route?: Route }) => {
  return (
    <Main route={route}>
      <Stack
        alignItems='flex-start'
        spacing={4}
        mx='auto'
        direction={{ base: 'column', xl: 'row' }}
      >
        <Stack spacing={4} flex='1 1 0%' width='full'>
          <Portfolio />
        </Stack>
        <Stack flex='1 1 0%' width='full' maxWidth={{ base: 'full', xl: 'sm' }} spacing={4}>
          <DashboardSidebar />
        </Stack>
      </Stack>
    </Main>
  )
}
