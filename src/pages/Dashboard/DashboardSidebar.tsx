import { Flex } from '@chakra-ui/react'
import { PromoCard } from 'components/Promo/PromoCard'

import { RecentTransactions } from './RecentTransactions'
import { TradeCard } from './TradeCard'

export const DashboardSidebar = () => {
  return (
    <Flex width='full' flexDir='column' gap={6}>
      <PromoCard />
      <TradeCard display={{ base: 'none', md: 'block' }} />
      <RecentTransactions />
    </Flex>
  )
}
