import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons'
import { Box, useMediaQuery } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import { noop } from 'lodash'
import groupBy from 'lodash/groupBy'
import { memo, useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'
import type { Column, Row } from 'react-table'

import { AssetCell } from './AssetCell'
import { ChangeCell } from './ChangeCell'
import { PriceCell } from './PriceCell'
import { SparkLineCell } from './SparkLineCell'
import { TradeButtonCell } from './TradeButtonCell'
import { VolumeCell } from './VolumeCell'

import { AssetList } from '@/components/AssetSearch/components/AssetList'
import { GroupedAssets } from '@/components/MarketTableVirtualized/GroupedAssets'
import { InfiniteTable } from '@/components/ReactTable/InfiniteTable'
import { Text } from '@/components/Text'
import { useFetchFiatAssetMarketData } from '@/state/apis/fiatRamps/hooks'
import { breakpoints } from '@/theme/theme'

type MarketsTableVirtualizedProps = {
  rows: Asset[]
  onRowClick: (row: Row<Asset>) => void
  onRowLongPress?: (row: Row<Asset>) => void
}

type AssetWithRelatedAssetIds = Asset & {
  isGrouped?: boolean
  relatedAssetIds?: string[]
}

export const MarketsTableVirtualized: React.FC<MarketsTableVirtualizedProps> = memo(
  ({ rows, onRowClick, onRowLongPress }) => {
    const translate = useTranslate()
    const navigate = useNavigate()
    const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })

    const uniqueRows = useMemo(() => {
      if (!isLargerThanMd) return rows

      const grouped = groupBy(rows, asset => {
        const baseAssetName = asset.name.split(' on ')[0]
        return `${baseAssetName}_${asset.symbol}`
      })

      const groupedResults = Object.values(grouped).map(group => {
        if (group.length === 1) return group[0]

        const primaryAsset = group[0]
        return {
          ...primaryAsset,
          isGrouped: true,
          relatedAssetIds: group.map(asset => asset.assetId),
        }
      })

      return groupedResults
    }, [rows, isLargerThanMd])

    const [visibleAssetIds, setVisibleAssetIds] = useState<Set<string>>(new Set())

    useFetchFiatAssetMarketData(Array.from(visibleAssetIds))

    const handleVisibleRowsChange = useCallback((visibleRows: Asset[]) => {
      const assetIds = visibleRows.map(row => row.assetId)
      setVisibleAssetIds(new Set(assetIds))
    }, [])

    const handleTradeClick = useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation()
        const assetId = e.currentTarget.getAttribute('data-asset-id')
        if (!assetId) return
        navigate(`/trade/${assetId}`)
      },
      [navigate],
    )

    const tradeTranslation = useMemo(
      () => translate('assets.assetCards.assetActions.trade'),
      [translate],
    )

    const columns = useMemo<Column<Asset>[]>(
      () => [
        {
          id: 'assetId',
          Header: () => <Text translation='dashboard.portfolio.asset' />,
          Cell: ({ row }: { row: Row<AssetWithRelatedAssetIds> }) => (
            <AssetCell
              assetId={row.original.assetId}
              symbol={row.original.symbol}
              isGrouped={Boolean(row.original.isGrouped)}
            />
          ),
        },
        ...(isLargerThanMd
          ? [
              {
                id: 'sparkline',
                Cell: ({ row }: { row: Row<Asset> }) => (
                  <SparkLineCell assetId={row.original.assetId} themeColor={row.original.color} />
                ),
              },
            ]
          : []),
        {
          id: 'price',
          Header: () => <Text ml='auto' translation='dashboard.portfolio.price' />,
          Cell: ({ row }: { row: Row<Asset> }) => <PriceCell assetId={row.original.assetId} />,
        },
        ...(isLargerThanMd
          ? [
              {
                id: 'change',
                Header: () => <Text translation='dashboard.portfolio.priceChange' />,
                Cell: ({ row }: { row: Row<Asset> }) => (
                  <ChangeCell assetId={row.original.assetId} />
                ),
              },
            ]
          : []),
        ...(isLargerThanMd
          ? [
              {
                id: 'volume',
                Header: () => <Text translation='dashboard.portfolio.volume' />,
                Cell: ({ row }: { row: Row<Asset> }) => (
                  <VolumeCell assetId={row.original.assetId} />
                ),
              },
            ]
          : []),
        ...(isLargerThanMd
          ? [
              {
                id: 'trade',
                Cell: ({ row }: { row: Row<Asset> }) => (
                  <TradeButtonCell
                    assetId={row.original.assetId}
                    onClick={handleTradeClick}
                    translation={tradeTranslation}
                  />
                ),
              },
            ]
          : []),
        {
          Header: '',
          id: 'toggle',
          width: 50,
          Cell: ({ row }: { row: Row<AssetWithRelatedAssetIds> }) => {
            if (!row.original.isGrouped) return null

            return row.isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />
          },
        },
      ],
      [handleTradeClick, isLargerThanMd, tradeTranslation],
    )

    const handleRowClick = useCallback(
      (row: Row<AssetWithRelatedAssetIds>) => {
        if (row.original.isGrouped) return
        onRowClick(row)
      },
      [onRowClick],
    )

    const renderSubComponent = useCallback(
      (row: Row<AssetWithRelatedAssetIds>) => {
        if (!row.original.isGrouped) return null

        return <GroupedAssets row={row} onRowClick={onRowClick} onRowLongPress={onRowLongPress} />
      },
      [onRowClick, onRowLongPress],
    )

    if (!isLargerThanMd) {
      return (
        <Box px={2}>
          <AssetList
            assets={rows}
            // eslint-disable-next-line react-memo/require-usememo
            handleClick={asset => onRowClick({ original: asset } as Row<Asset>)}
            handleLongPress={
              onRowLongPress
                ? asset => onRowLongPress({ original: asset } as Row<Asset>)
                : undefined
            }
            height='100vh'
            shouldDisplayRelatedAssets
            showPrice
          />
        </Box>
      )
    }

    return (
      <InfiniteTable
        columns={columns}
        data={uniqueRows}
        onRowClick={handleRowClick}
        onRowLongPress={onRowLongPress}
        onVisibleRowsChange={handleVisibleRowsChange}
        renderSubComponent={renderSubComponent}
        displayHeaders={true}
        variant='clickable'
        hasMore={false}
        loadMore={noop}
      />
    )
  },
)
