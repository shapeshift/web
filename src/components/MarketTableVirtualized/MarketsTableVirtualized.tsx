import { Box, Button, Table, Tbody, Td, Th, Thead, Tr, useMediaQuery } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import type { ColumnDef, Row } from '@tanstack/react-table'
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import type { VirtualItem } from '@tanstack/react-virtual'
import { useVirtualizer } from '@tanstack/react-virtual'
import { memo, useCallback, useMemo, useRef } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'
import { LongPressEventType, useLongPress } from 'use-long-press'

import { AssetCell } from './AssetCell'
import { ChangeCell } from './ChangeCell'
import { PriceCell } from './PriceCell'
import { SparkLineCell } from './SparkLineCell'
import { TradeButtonCell } from './TradeButtonCell'
import { VolumeCell } from './VolumeCell'

import { Text } from '@/components/Text'
import { defaultLongPressConfig, longPressSx } from '@/constants/long-press'
import { isMobile as isMobileApp } from '@/lib/globals'
import { useFetchFiatAssetMarketData } from '@/state/apis/fiatRamps/hooks'
import { breakpoints } from '@/theme/theme'
import { pulseAndroid } from '@/utils/pulseAndroid'

const ROW_HEIGHT = 70

const tableSizeSx = { base: 'sm', md: 'md' }
const gridTemplateColumnsSx = {
  base: '70% 30%',
  md: '2fr 1fr 1fr 1fr 1fr 80px',
}

// Hide virtual list container scrollbar across all major browsers
const tableContainerSx = {
  '&::-webkit-scrollbar': {
    display: 'none',
  },
  '-ms-overflow-style': 'none',
  scrollbarWidth: 'none',
  height: isMobileApp ? 'calc(100vh - 72px)' : '100vh',
}

const headerGridSx = {
  display: 'grid',
  gridTemplateColumns: gridTemplateColumnsSx,
  width: 'full',
  gap: '4px',
}

const gridSx = {
  display: 'grid',
  gridTemplateColumns: gridTemplateColumnsSx,
  width: '100%',
  gap: 4,
  alignItems: 'center',
  '& td': {
    base: {
      paddingRight: 4,
      paddingLeft: 4,
      paddingEnd: 4,
      paddingStart: 4,
    },
    sm: {
      paddingRight: '0!important',
      paddingLeft: '0!important',
      paddingEnd: '0!important',
      paddingStart: '0!important',
    },
  },
  ...longPressSx,
}

type MarketsTableVirtualizedProps = {
  rows: Asset[]
  onRowClick: (arg: Row<Asset>) => void
  onRowLongPress?: (arg: Row<Asset>) => void
}

export const MarketsTableVirtualized: React.FC<MarketsTableVirtualizedProps> = memo(
  ({ rows, onRowClick, onRowLongPress }) => {
    const translate = useTranslate()
    const navigate = useNavigate()
    const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })

    const longPressHandlers = useLongPress((_, { context: row }) => {
      pulseAndroid()
      onRowLongPress?.(row as Row<Asset>)
    }, defaultLongPressConfig)

    const parentRef = useRef<HTMLDivElement>(null)

    const rowVirtualizer = useVirtualizer({
      // Magic number, but realistically, Ttat's already quite the scroll and API spew
      // No point to virtualize the whole current ~20k assets list
      count: Math.min(rows.length, 3000),
      getScrollElement: () => parentRef.current,
      estimateSize: () => ROW_HEIGHT,
      // Render approximately 3vh (or more if on mobile) of items in advance to avoid blank page flickers when scrolling
      overscan: 40,
    })

    // Only fetch market data for visible rows
    // Do *NOT* memoize me, as it relies on stable rowVirtualizer
    const visibleAssetIds = rowVirtualizer
      .getVirtualItems()
      .map(virtualItem => rows[virtualItem.index].assetId)

    // Only fetch market data for visible rows
    useFetchFiatAssetMarketData(visibleAssetIds)

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

    const columns = useMemo<ColumnDef<Asset>[]>(
      () => [
        {
          accessorKey: 'assetId',
          header: () => <Text translation='dashboard.portfolio.asset' />,
          cell: ({ row }) => (
            <AssetCell assetId={row.original.assetId} symbol={row.original.symbol} />
          ),
        },
        ...(isLargerThanMd
          ? [
              {
                id: 'sparkline',
                cell: ({ row }: { row: Row<Asset> }) => (
                  <SparkLineCell assetId={row.original.assetId} themeColor={row.original.color} />
                ),
              },
            ]
          : []),
        {
          id: 'price',
          header: () => <Text ml='auto' translation='dashboard.portfolio.price' />,
          cell: ({ row }) => <PriceCell assetId={row.original.assetId} />,
        },
        ...(isLargerThanMd
          ? [
              {
                id: 'change',
                header: () => <Text translation='dashboard.portfolio.priceChange' />,
                cell: ({ row }: { row: Row<Asset> }) => (
                  <ChangeCell assetId={row.original.assetId} />
                ),
              },
            ]
          : []),
        ...(isLargerThanMd
          ? [
              {
                id: 'volume',
                header: () => <Text translation='dashboard.portfolio.volume' />,
                cell: ({ row }: { row: Row<Asset> }) => (
                  <VolumeCell assetId={row.original.assetId} />
                ),
              },
            ]
          : []),
        ...(isLargerThanMd
          ? [
              {
                id: 'trade',
                cell: ({ row }: { row: Row<Asset> }) => (
                  <TradeButtonCell
                    assetId={row.original.assetId}
                    onClick={handleTradeClick}
                    translation={tradeTranslation}
                  />
                ),
              },
            ]
          : []),
      ],
      [handleTradeClick, isLargerThanMd, tradeTranslation],
    )

    const table = useReactTable({
      data: rows,
      columns,
      getCoreRowModel: getCoreRowModel(),
    })

    const { rows: tableRows } = table.getRowModel()

    const renderRow = useCallback(
      (virtualRow: VirtualItem) => {
        const row = tableRows[virtualRow.index]
        return (
          <Tr
            as={Button}
            key={row.id}
            height={`${ROW_HEIGHT}px`}
            transform={`translateY(${virtualRow.start}px)`}
            position='absolute'
            top={0}
            left={0}
            right={0}
            width='100%'
            my={2}
            variant='ghost'
            px={2}
            // eslint-disable-next-line react-memo/require-usememo
            onClick={() => onRowClick(row)}
            sx={gridSx}
            {...longPressHandlers(row)}
          >
            {row.getVisibleCells().map(cell => {
              const textAlign = (() => {
                if (cell.column.id === 'assetId') return 'left'
                if (cell.column.id === 'price') return 'left'
                if (cell.column.id === 'sparkline') return 'center'
                return 'right'
              })()
              return (
                <Td key={cell.id} textAlign={textAlign}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </Td>
              )
            })}
          </Tr>
        )
      },
      [longPressHandlers, onRowClick, tableRows],
    )

    return (
      <Box ref={parentRef} overflow='auto' sx={tableContainerSx} position='relative'>
        <Table variant='unstyled' size={tableSizeSx}>
          {isLargerThanMd && (
            <Thead position='sticky' top={0} bg='background.surface.base' zIndex={1}>
              <Tr sx={headerGridSx}>
                {table.getHeaderGroups().map(headerGroup =>
                  headerGroup.headers.map(header => {
                    const textAlign = (() => {
                      if (header.column.id === 'assetId') return 'left'
                      if (header.column.id === 'sparkline') return 'center'
                      return 'right'
                    })()

                    return (
                      <Th key={header.id} color='text.subtle' textAlign={textAlign}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </Th>
                    )
                  }),
                )}
              </Tr>
            </Thead>
          )}
          <Tbody height={`${rowVirtualizer.getTotalSize()}px`} position='relative'>
            {rowVirtualizer.getVirtualItems().map(virtualRow => renderRow(virtualRow))}
          </Tbody>
        </Table>
      </Box>
    )
  },
)
