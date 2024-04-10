import { Button, Heading, Stack } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import { useCallback, useMemo } from 'react'
import { FaStar } from 'react-icons/fa6'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import type { Row } from 'react-table'
import { MarketsTable } from 'components/MarketsTable'
import { ResultsEmpty } from 'components/ResultsEmpty'
import { Text } from 'components/Text'
import { selectAssetsSortedByMarketCap, selectWatchedAssetIds } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

const starFilled = <FaStar />
const emptyButtonProps = { size: 'lg', width: 'full', colorScheme: 'blue.500' }

export const PriceTable = () => {
  const watchedAssetIds = useAppSelector(selectWatchedAssetIds)
  const assets = useAppSelector(selectAssetsSortedByMarketCap)
  const history = useHistory()
  const translate = useTranslate()
  const rows = useMemo(() => {
    return assets.filter(asset => watchedAssetIds.includes(asset.assetId))
  }, [assets, watchedAssetIds])

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
  const body = useMemo(() => {
    if (watchedAssetIds.length) {
      return (
        <>
          <MarketsTable rows={rows} onRowClick={handleRowClick} />
          <Button mx={6} onClick={handleButtonClick}>
            {translate('watchlist.empty.cta')}
          </Button>
        </>
      )
    }
    return (
      <ResultsEmpty
        icon={starFilled}
        title='watchlist.empty.title'
        body='watchlist.empty.body'
        ctaText='watchlist.empty.cta'
        ctaHref='/assets'
        buttonProps={emptyButtonProps}
      />
    )
  }, [handleButtonClick, handleRowClick, rows, translate, watchedAssetIds.length])
  return (
    <Stack>
      <Heading as='h6' px={6}>
        <Text translation='common.prices' />
      </Heading>
      {body}
    </Stack>
  )
}
