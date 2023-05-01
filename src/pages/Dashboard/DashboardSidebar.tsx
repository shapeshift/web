import { Flex, Image } from '@chakra-ui/react'
import { btcAssetId, dogeAssetId, foxAssetId } from '@shapeshiftoss/caip'
import OnRamperLogo from 'assets/on-ramper.png'
import SaversVaultTop from 'assets/savers-vault-top.png'
import { AssetIcon } from 'components/AssetIcon'
import { PromoCard } from 'components/Promo/PromoCard'
import type { PromoItem } from 'components/Promo/types'
import { EligibleCarousel } from 'pages/Defi/components/EligibleCarousel'

import { RecentTransactions } from './RecentTransactions'
import { TradeCard } from './TradeCard'

const promoData: PromoItem[] = [
  {
    title: 'promo.onRamper.title',
    body: 'promo.onRamper.body',
    cta: 'promo.onRamper.cta',
    image: `url(https://uploads-ssl.webflow.com/5cec55545d0f47cfe2a39a8e/637d3eab8977b9c820ecb3fc_foxy-promo-1.jpg)`,
    startDate: '2023-01-01 08:00 AM',
    endDate: '2023-01-01 08:00 AM',
    id: 'apple-pay',
    href: 'https://widget.onramper.com/?apiKey=pk_prod_ViOib9FcqKQeqqBsLF6ZPYis8X0Wdl9ma16rBhTxXmw0&defaultCrypto=ETH&supportSell=false&isAddressEditable=false&language=en&darkMode=true&redirectURL=https%3A%2F%2Fapp.shapeshift.com%2F%23%2Fbuy-crypto&onlyGateways=Mercuryo',
    walletRequired: false,
    rightElement: <Image width='80px' overflow='hidden' borderRadius='lg' src={OnRamperLogo} />,
    isExternal: true,
  },
  {
    title: ['promo.savers.title', { asset: 'BTC' }],
    body: 'promo.savers.body',
    cta: 'promo.savers.cta',
    image: SaversVaultTop,
    startDate: '2023-02-20 8:00 AM',
    endDate: '2023-02-25 8:00 AM',
    id: 'savers-btc',
    href: '?type=staking&provider=THORChain%20Savers&chainId=bip122%3A000000000019d6689c085ae165831e93&defaultAccountId=cosmos%3Aosmosis-1%3Aosmo182emakchj2xp0llv5k87gsannvsa0cygdx307z&assetNamespace=slip44&assetReference=0&modal=overview',
    walletRequired: true,
    isExternal: false,
    rightElement: <AssetIcon assetId={btcAssetId} />,
  },
  {
    title: ['promo.savers.title', { asset: 'DOGE' }],
    body: 'promo.savers.body',
    cta: 'promo.savers.cta',
    image: SaversVaultTop,
    startDate: '2023-04-27 8:00 AM',
    endDate: '2023-05-18 8:00 AM',
    id: 'promo-savers-doge',
    href: '?provider=THORChain%20Savers&type=staking&chainId=bip122%3A00000000001a91e3dace36e2be3bf030&assetNamespace=slip44&assetReference=3&modal=overview',
    walletRequired: true,
    isExternal: false,
    rightElement: <AssetIcon assetId={dogeAssetId} />,
  },
  {
    title: 'plugins.foxPage.dappBack.title',
    body: 'plugins.foxPage.dappBack.body',
    cta: 'plugins.foxPage.dappBack.cta',
    startDate: '2023-03-01 8:00 AM',
    endDate: '2023-03-07 8:00 AM',
    id: 'dappback-promo',
    href: 'https://dappback.com/shapeshift',
    walletRequired: false,
    isExternal: true,
    rightElement: <AssetIcon assetId={foxAssetId} />,
  },
]

export const DashboardSidebar = () => {
  return (
    <Flex width='full' flexDir='column' gap={6}>
      <PromoCard data={promoData} />
      <TradeCard display={{ base: 'none', xl: 'block' }} />
      <EligibleCarousel display={{ base: 'none', md: 'flex' }} />
      <RecentTransactions limit={8} viewMoreLink />
    </Flex>
  )
}
