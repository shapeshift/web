import { Button } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import type { Row } from 'react-table'
import { MarketsTable } from 'components/MarketsTable'
import { selectAssetsSortedByMarketCap } from 'state/selectors'
import { useAppSelector } from 'state/store'

export const TopAssetsTable = () => {
  const assets = useAppSelector(selectAssetsSortedByMarketCap)
  const history = useHistory()
  const translate = useTranslate()
  const rows = useMemo(() => {
    return assets.slice(0, 30).reduce<Asset[]>((acc, asset) => {
      // Check if we've already collected 10 assets
      if (acc.length >= 10) {
        return acc
      }

      if (!asset.relatedAssetKey || asset.assetId === asset.relatedAssetKey) {
        acc.push(asset)
      }

      return acc
    }, [])
  }, [assets])

  const handleButtonClick = useCallback(() => {
    history.push('/assets')
  }, [history])

  const handleRowClick = useCallback(
    (row: Row<Asset>) => {
      const { assetId } = row.original
      const url = assetId ? `/assets/${assetId}` : ''
      history.push(url)
    },
    [history],
  )
  return (
    <>
      <MarketsTable rows={rows} onRowClick={handleRowClick} />
      <Button mx={6} onClick={handleButtonClick}>
        {translate('watchlist.empty.cta')}
      </Button>
    </>
  )
}
