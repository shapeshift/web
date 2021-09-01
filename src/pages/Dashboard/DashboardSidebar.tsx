import { Stack } from '@chakra-ui/react'

import { RecentTransactions } from './RecentTransactions'

export const DashboardSidebar = () => {
  return (
    <Stack width='full' spacing={6}>
      <RecentTransactions />
    </Stack>
  )
}
