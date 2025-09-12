import { Button } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import { useCallback, useMemo } from 'react'
import { FaStar } from 'react-icons/fa6'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'
import type { Row } from 'react-table'

import { MarketsTable } from '@/components/MarketsTable'
import { ResultsEmpty } from '@/components/ResultsEmpty'
import { vibrate } from '@/lib/vibrate'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { selectAssetsSortedByMarketCap } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const starFilled = <FaStar />
const emptyButtonProps = { size: 'lg', width: 'full', colorScheme: 'blue' }

type WatchlistTableProps = {
  forceCompactView?: boolean
  onRowClick?: () => void
  onExploreMore?: () => void
}

export const WatchlistTable = ({
  forceCompactView = false,
  onRowClick,
  onExploreMore,
}: WatchlistTableProps) => {
  const watchedAssetIds = useAppSelector(preferences.selectors.selectWatchedAssetIds)
  const assets = useAppSelector(selectAssetsSortedByMarketCap)
  const navigate = useNavigate()
  const translate = useTranslate()
  const rows = useMemo(() => {
    return assets.filter(asset => watchedAssetIds.includes(asset.assetId))
  }, [assets, watchedAssetIds])

  const handleButtonClick = useCallback(() => {
    navigate('/assets')
    onExploreMore?.()
  }, [navigate, onExploreMore])

  const handleRowClick = useCallback(
    (row: Row<Asset>) => {
      onRowClick?.()
      vibrate('heavy')
      const { assetId } = row.original
      const url = assetId ? `/assets/${assetId}` : ''
      navigate(url)
    },
    [navigate, onRowClick],
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
        onCtaClick={onExploreMore}
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
}
