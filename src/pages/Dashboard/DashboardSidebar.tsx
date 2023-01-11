import { Flex } from '@chakra-ui/react'
import { useSelector } from 'react-redux'
import { IOSPromoCards } from 'components/Promo/iOSPromoCards'
import { PromoCard } from 'components/Promo/PromoCard'
import type { PromoItem } from 'components/Promo/types'
import { EligibleCarousel } from 'pages/Defi/components/EligibleCarousel'
import { selectFeatureFlags } from 'state/slices/selectors'

import { RecentTransactions } from './RecentTransactions'
import { TradeCard } from './TradeCard'

const promoData: PromoItem[] = [
  {
    title: 'Earn 3.15% APY on FOX',
    body: 'Your FOX is put to work across different DeFi protocols to earn the best yield possible.',
    cta: 'Deposit FOX Now',
    image: `url(https://uploads-ssl.webflow.com/5cec55545d0f47cfe2a39a8e/637d3eab8977b9c820ecb3fc_foxy-promo-1.jpg)`,
    colorScheme: 'pink',
    startDate: '2022-11-28 08:00 AM',
    endDate: '2022-12-04 08:00 AM',
    id: 'foxy-promo',
    walletRequired: true,
    href: '?chainId=eip155%3A1&contractAddress=0xee77aa3Fd23BbeBaf94386dD44b548e9a785ea4b&assetReference=0xc770eefad204b5180df6a14ee197d99d808ee52d&rewardId=0xDc49108ce5C57bc3408c3A5E95F3d864eC386Ed3&provider=ShapeShift&modal=deposit',
  },
]

export const DashboardSidebar = () => {
  const { EligibleEarn } = useSelector(selectFeatureFlags)
  return (
    <Flex width='full' flexDir='column' gap={6}>
      <PromoCard data={promoData} />
      <IOSPromoCards />
      {EligibleEarn && <EligibleCarousel display={{ base: 'none', md: 'flex' }} />}
      <TradeCard display={{ base: 'none', md: 'block' }} />
      <RecentTransactions limit={4} viewMoreLink />
    </Flex>
  )
}
