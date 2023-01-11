import { Flex } from '@chakra-ui/react'
import { useSelector } from 'react-redux'
import { IOSPromoCards } from 'components/Promo/iOSPromoCards'
import { EligibleCarousel } from 'pages/Defi/components/EligibleCarousel'
import { selectFeatureFlags } from 'state/slices/selectors'

import { RecentTransactions } from './RecentTransactions'
import { TradeCard } from './TradeCard'

export const DashboardSidebar = () => {
  const { EligibleEarn } = useSelector(selectFeatureFlags)
  return (
    <Flex width='full' flexDir='column' gap={6}>
      <IOSPromoCards />
      {EligibleEarn && <EligibleCarousel display={{ base: 'none', md: 'flex' }} />}
      <TradeCard display={{ base: 'none', md: 'block' }} />
      <RecentTransactions limit={4} viewMoreLink />
    </Flex>
  )
}
