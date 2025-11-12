import { Button } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import { memo, useCallback, useMemo } from 'react'
import { FaStar } from 'react-icons/fa6'
import { useTranslate } from 'react-polyglot'

import { AssetList } from '@/components/AssetSearch/components/AssetList'
import { MarketRow } from '@/components/AssetSearch/components/MarketRow'
import { ResultsEmpty } from '@/components/ResultsEmpty'
import { useBrowserRouter } from '@/hooks/useBrowserRouter/useBrowserRouter'
import { useModal } from '@/hooks/useModal/useModal'
import { vibrate } from '@/lib/vibrate'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { selectAssetsSortedByMarketCap } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const starFilled = <FaStar />
const emptyButtonProps = { size: 'lg', width: 'full', colorScheme: 'blue' }

export const WatchlistTable = memo(() => {
  const watchedAssetIds = useAppSelector(preferences.selectors.selectWatchedAssetIds)
  const assets = useAppSelector(selectAssetsSortedByMarketCap)
  const { navigate } = useBrowserRouter()
  const walletDrawer = useModal('walletDrawer')
  const translate = useTranslate()
  const rows = useMemo(() => {
    return assets.filter(asset => watchedAssetIds.includes(asset.assetId))
  }, [assets, watchedAssetIds])

  const handleButtonClick = useCallback(() => {
    if (walletDrawer.isOpen) {
      walletDrawer.close()
    }
    navigate('/assets')
  }, [navigate, walletDrawer])

  const handleRowClick = useCallback(
    (asset: Asset) => {
      if (walletDrawer.isOpen) {
        walletDrawer.close()
      }
      vibrate('heavy')
      const { assetId } = asset
      const url = assetId ? `/assets/${assetId}` : ''
      navigate(url)
    },
    [navigate, walletDrawer],
  )

  if (watchedAssetIds.length === 0) {
    return (
      <ResultsEmpty
        icon={starFilled}
        title='watchlist.empty.title'
        body='watchlist.empty.body'
        ctaText='watchlist.empty.cta'
        ctaHref='/assets'
        buttonProps={emptyButtonProps}
        onCtaClick={handleButtonClick}
      />
    )
  }
  return (
    <>
      <AssetList assets={rows} handleClick={handleRowClick} rowComponent={MarketRow} />
      <Button onClick={handleButtonClick} width='full' mt={4}>
        {translate('watchlist.empty.cta')}
      </Button>
    </>
  )
})
