import { Flex } from '@chakra-ui/react'
import { useLocation } from 'react-router'

import { RecentTransactions } from './RecentTransactions'
import { TradeCard } from './TradeCard'

export const DashboardSidebar = () => {
  const location = useLocation<{ defaultBuyAssetId: string }>()
  return (
    <Flex width='full' flexDir='column' gap={6}>
      <TradeCard
        defaultBuyAssetId={location.state?.defaultBuyAssetId}
        display={{ base: 'none', md: 'block' }}
      />
      <RecentTransactions />
    </Flex>
  )
}
