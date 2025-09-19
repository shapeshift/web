import { Button } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import { memo, useCallback, useMemo } from 'react'
import { FaStar } from 'react-icons/fa6'
import { useTranslate } from 'react-polyglot'
import type { Row } from 'react-table'

import { MarketsTable } from '@/components/MarketsTable'
import { ResultsEmpty } from '@/components/ResultsEmpty'
import { useBrowserRouter } from '@/hooks/useBrowserRouter/useBrowserRouter'
import { useModal } from '@/hooks/useModal/useModal'
import { vibrate } from '@/lib/vibrate'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { selectAssetsSortedByMarketCap } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const starFilled = <FaStar />
const emptyButtonProps = { size: 'lg', width: 'full', colorScheme: 'blue' }

type WatchlistTableProps = {
  forceCompactView?: boolean
}

export const WatchlistTable = memo(({ forceCompactView = false }: WatchlistTableProps) => {
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
    (row: Row<Asset>) => {
      if (walletDrawer.isOpen) {
        walletDrawer.close()
      }
      vibrate('heavy')
      const { assetId } = row.original
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
      <MarketsTable rows={rows} onRowClick={handleRowClick} forceCompactView={forceCompactView} />
      <Button mx={6} onClick={handleButtonClick}>
        {translate('watchlist.empty.cta')}
      </Button>
    </>
  )
})
