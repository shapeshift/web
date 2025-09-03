import { Flex, Image } from '@chakra-ui/react'
import { dogeAssetId, foxAssetId } from '@shapeshiftoss/caip'
import { memo, useDeferredValue, useEffect, useState } from 'react'

import { RecentTransactions } from './RecentTransactions'
import { RecentTransactionsSkeleton } from './RecentTransactionsSkeleton'

import OnRamperLogo from '@/assets/onramper-logo.svg'
import SaversVaultTop from '@/assets/savers-vault-top.png'
import { AssetIcon } from '@/components/AssetIcon'
import { PromoCard } from '@/components/Promo/PromoCard'
import type { PromoItem } from '@/components/Promo/types'
import { useWallet } from '@/hooks/useWallet/useWallet'

const displayXlFlex = { base: 'none', xl: 'flex' }

const promoData: PromoItem[] = [
  {
    title: 'promo.onRamper.title',
    body: 'promo.onRamper.body',
    cta: 'promo.onRamper.cta',
    image: `url(https://uploads-ssl.webflow.com/5cec55545d0f47cfe2a39a8e/637d3eab8977b9c820ecb3fc_foxy-promo-1.jpg)`,
    startDate: '2023-01-01 08:00 AM',
    endDate: '2023-01-01 08:00 AM',
    id: 'apple-pay',
    href: 'https://widget.onramper.com/?apiKey=pk_prod_ViOib9FcqKQeqqBsLF6ZPYis8X0Wdl9ma16rBhTxXmw0&defaultCrypto=ETH&supportSell=false&isAddressEditable=false&language=en&darkMode=true&redirectURL=https%3A%2F%2Fapp.shapeshift.com%2F%23%2Framp%2Fbuy&onlyGateways=Mercuryo',
    walletRequired: false,
    rightElement: <Image width='80px' overflow='hidden' borderRadius='lg' src={OnRamperLogo} />,
    isExternal: true,
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

export const DashboardSidebar = memo(() => {
  const {
    state: { isConnected },
  } = useWallet()

  const [isMounted, setIsMounted] = useState(false)
  const shouldRenderRecentTransactions = useDeferredValue(isMounted)

  useEffect(() => {
    // Seems useless, but ensures this is set on next tick (which isn't available on browsers)
    const timerId = setTimeout(() => {
      setIsMounted(true)
    }, 0)

    return () => clearTimeout(timerId)
  }, [])

  if (!isConnected) return null

  return (
    <Flex width='full' flexDir='column' gap={6}>
      <PromoCard data={promoData} />
      {shouldRenderRecentTransactions ? (
        <RecentTransactions limit={8} viewMoreLink display={displayXlFlex} />
      ) : (
        <RecentTransactionsSkeleton limit={5} viewMoreLink display={displayXlFlex} />
      )}
    </Flex>
  )
})
