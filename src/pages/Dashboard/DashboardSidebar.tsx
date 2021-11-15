import { Stack } from '@chakra-ui/react'

import { RecentTransactions } from './RecentTransactions'
import { TradeCard } from './TradCard'

export const DashboardSidebar = () => {
  return (
    <Stack width='full' spacing={6}>
      <TradeCard />
      <RecentTransactions />
    </Stack>
  )
}
