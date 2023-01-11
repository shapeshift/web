import { Flex, Image } from '@chakra-ui/react'
import { useSelector } from 'react-redux'
import OnRamperLogo from 'assets/on-ramper.png'
import { IOSPromoCards } from 'components/Promo/iOSPromoCards'
import { PromoCard } from 'components/Promo/PromoCard'
import type { PromoItem } from 'components/Promo/types'
import { EligibleCarousel } from 'pages/Defi/components/EligibleCarousel'
import { selectFeatureFlags } from 'state/slices/selectors'

import { RecentTransactions } from './RecentTransactions'
import { TradeCard } from './TradeCard'

const promoData: PromoItem[] = [
  {
    title: 'promo.onRamper.title',
    body: 'promo.onRamper.body',
    cta: 'promo.onRamper.cta',
    image: `url(https://uploads-ssl.webflow.com/5cec55545d0f47cfe2a39a8e/637d3eab8977b9c820ecb3fc_foxy-promo-1.jpg)`,
    startDate: '2023-01-01 08:00 AM',
    endDate: '2023-02-01 08:00 AM',
    id: 'apple-pay',
    href: 'https://widget.onramper.com/?apiKey=pk_prod_ViOib9FcqKQeqqBsLF6ZPYis8X0Wdl9ma16rBhTxXmw0&defaultCrypto=ETH&supportSell=false&isAddressEditable=false&language=en&darkMode=true&redirectURL=https%3A%2F%2Fapp.shapeshift.com%2F%23%2Fbuy-crypto&onlyGateways=Mercuryo',
    walletRequired: false,
    rightElement: <Image width='80px' overflow='hidden' borderRadius='lg' src={OnRamperLogo} />,
    isExternal: true,
  },
]

export const DashboardSidebar = () => {
  const { EligibleEarn } = useSelector(selectFeatureFlags)
  return (
    <Flex width='full' flexDir='column' gap={6}>
      <IOSPromoCards />
      <PromoCard data={promoData} />
      {EligibleEarn && <EligibleCarousel display={{ base: 'none', md: 'flex' }} />}
      <TradeCard display={{ base: 'none', md: 'block' }} />
      <RecentTransactions limit={4} viewMoreLink />
    </Flex>
  )
}
