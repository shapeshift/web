import type { StackDirection } from '@chakra-ui/react'
import { Stack } from '@chakra-ui/react'
import { memo } from 'react'

import { DashboardSidebar } from './DashboardSidebar'
import { Portfolio } from './Portfolio'

const direction: StackDirection = { base: 'column', xl: 'row' }
const maxWidth = { base: 'full', xl: 'sm' }

export const WalletDashboard = memo(() => {
  return (
    <Stack alignItems='flex-start' spacing={6} mx='auto' direction={direction}>
      <Stack spacing={4} flex='1 1 0%' width='full'>
        <Portfolio />
      </Stack>
      <Stack flex='1 1 0%' width='full' maxWidth={maxWidth} spacing={4}>
        <DashboardSidebar />
      </Stack>
    </Stack>
  )
})
