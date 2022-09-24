import { Flex } from '@chakra-ui/react'

import { RecentTransactions } from './RecentTransactions'
import { TradeCard } from './TradeCard'

export const DashboardSidebar = () => {
  return (
    <Flex width='full' flexDir='column' gap={6}>
      <TradeCard display={{ base: 'none', md: 'block' }} />
      <RecentTransactions />
    </Flex>
  )
}
