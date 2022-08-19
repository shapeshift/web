import { Stack } from '@chakra-ui/react'
import { ethAssetId } from '@shapeshiftoss/caip'
import { Main } from 'components/Layout/Main'
import { useGetUsdRateQuery } from 'state/apis/swapper/swapperApi'

import { DashboardSidebar } from './DashboardSidebar'
import { Portfolio } from './Portfolio'

export type MatchParams = {
  assetId: string
}

export const Dashboard = () => {
  const hookReturn = useGetUsdRateQuery({ assetId: ethAssetId })
  console.info(JSON.stringify(hookReturn, null, 2))

  return (
    <Main>
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
