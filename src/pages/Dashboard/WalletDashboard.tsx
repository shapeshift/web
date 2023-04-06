import { Flex, Stack } from '@chakra-ui/react'

import { DashboardSidebar } from './DashboardSidebar'
import { Portfolio } from './Portfolio'

export const WalletDashboard = () => {
  return (
    <Flex gap={4} flexDir='column'>
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
    </Flex>
  )
}
