import {
  Box,
  Button,
  Stack,
  Table,
  Tag,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  useMediaQuery,
} from '@chakra-ui/react'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import type { Asset } from '@shapeshiftoss/types'
import type { ColumnDef, Row } from '@tanstack/react-table'
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import type { VirtualItem } from '@tanstack/react-virtual'
import { useVirtualizer } from '@tanstack/react-virtual'
import { truncate } from 'lodash'
import { memo, useCallback, useMemo, useRef } from 'react'
import { RiArrowRightDownFill, RiArrowRightUpFill } from 'react-icons/ri'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { Display } from 'components/Display'
import { AssetCell } from 'components/StakingVaults/Cells'
import { Text } from 'components/Text'
import { SparkLine } from 'pages/Buy/components/Sparkline'
import { useFetchFiatAssetMarketData } from 'state/apis/fiatRamps/hooks'
import { selectMarketDataUserCurrency } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import { breakpoints } from 'theme/theme'

const ROW_HEIGHT = 70

const arrowUp = <RiArrowRightUpFill />
const arrowDown = <RiArrowRightDownFill />

const tableSizeSx = { base: 'sm', md: 'md' }
const gridTemplateColumnsSx = {
  base: '1fr auto',
  md: '300px 140px minmax(100px, 1fr) minmax(100px, 1fr) minmax(100px, 1fr) 100px',
}
// Hide virtual list container scrollbar across all major browsers
const tableContainerSx = {
  '&::-webkit-scrollbar': {
    display: 'none',
  },
  '-ms-overflow-style': 'none',
  scrollbarWidth: 'none',
}

type MarketsTableVirtualizedProps = {
  rows: Asset[]
  onRowClick: (arg: Row<Asset>) => void
}

export const MarketsTableVirtualized: React.FC<MarketsTableVirtualizedProps> = memo(
  ({ rows, onRowClick }) => {
    const translate = useTranslate()
    const history = useHistory()
    const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })
    const marketDataUserCurrencyById = useAppSelector(selectMarketDataUserCurrency)

    const parentRef = useRef<HTMLDivElement>(null)

    const rowVirtualizer = useVirtualizer({
      // Magic number, but realistically, Ttat's already quite the scroll and API spew
      // No point to virtualize the whole current ~20k assets list
      count: Math.min(rows.length, 3000),
      getScrollElement: () => parentRef.current,
      estimateSize: () => ROW_HEIGHT,
      // Render approximately 1vh (or more if on mobile) of items in advance to avoid blank page flickers when scrolling
      overscan: 13,
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
        history.push(`/trade/${assetId}`)
      },
      [history],
    )
    const columns = useMemo<ColumnDef<Asset>[]>(
      () => [
        {
          accessorKey: 'assetId',
          header: () => <Text translation='dashboard.portfolio.asset' />,
          cell: ({ row }) => (
            <AssetCell
              assetId={row.original.assetId}
              subText={truncate(row.original.symbol, { length: 6 })}
            />
          ),
        },
        ...(isLargerThanMd
          ? [
              {
                id: 'sparkline',
                cell: ({ row }: { row: Row<Asset> }) => (
                  <Box width='full'>
                    <SparkLine
                      assetId={row.original.assetId}
                      themeColor={row.original.color}
                      height={35}
                    />
                  </Box>
                ),
              },
            ]
          : []),
        {
          id: 'price',
          header: () => <Text ml='auto' translation='dashboard.portfolio.price' />,
          cell: ({ row }) => {
            const change = bnOrZero(
              marketDataUserCurrencyById[row.original.assetId]?.changePercent24Hr ?? '0',
            ).times(0.01)
            const colorScheme = change.isPositive() ? 'green' : 'red'
            const icon = change.isPositive() ? arrowUp : arrowDown
            return (
              // Already memoized
              // eslint-disable-next-line react-memo/require-usememo
              <Stack alignItems={{ base: 'flex-start', md: 'flex-end' }}>
                <Amount.Fiat
                  fontWeight='semibold'
                  value={marketDataUserCurrencyById[row.original.assetId]?.price ?? '0'}
                />
                <Display.Mobile>
                  <Tag colorScheme={colorScheme} gap={1} size='sm'>
                    {icon}
                    <Amount.Percent value={change.abs().toString()} />
                  </Tag>
                </Display.Mobile>
              </Stack>
            )
          },
        },
        ...(isLargerThanMd
          ? [
              {
                id: 'change',
                header: () => <Text translation='dashboard.portfolio.priceChange' />,
                cell: ({ row }: { row: Row<Asset> }) => (
                  <Amount.Percent
                    fontWeight='semibold'
                    value={bnOrZero(
                      marketDataUserCurrencyById[row.original.assetId]?.changePercent24Hr ?? '0',
                    )
                      .times(0.01)
                      .toString()}
                    autoColor
                  />
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
                  <Amount.Fiat
                    fontWeight='semibold'
                    value={marketDataUserCurrencyById[row.original.assetId]?.volume ?? '0'}
                  />
                ),
              },
            ]
          : []),
        ...(isLargerThanMd
          ? [
              {
                id: 'trade',
                cell: ({ row }: { row: Row<Asset> }) => (
                  <Button data-asset-id={row.original.assetId} onClick={handleTradeClick}>
                    {translate('assets.assetCards.assetActions.trade')}
                  </Button>
                ),
              },
            ]
          : []),
      ],
      [handleTradeClick, isLargerThanMd, marketDataUserCurrencyById, translate],
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
          <Button
            variant='ghost'
            key={row.id}
            px={0}
            my={2}
            width={'full'}
            maxW='100%'
            // Already memoized
            // eslint-disable-next-line react-memo/require-usememo
            onClick={() => onRowClick(row)}
            // Need to absolute position rows to make dem work with react-table
            position='absolute'
            top={0}
            left={0}
            right={0}
            display='grid'
            alignItems='center'
            height={`${ROW_HEIGHT}px`}
            gridTemplateColumns={gridTemplateColumnsSx}
            py={2}
            gap={'4px'}
            transform={`translateY(${virtualRow.start}px)`}
          >
            {row.getVisibleCells().map(cell => {
              const textAlign = (() => {
                if (cell.column.id === 'assetId') return 'left'
                if (cell.column.id === 'price') return 'left'
                if (cell.column.id === 'sparkline') return 'center'
                return 'right'
              })()
              return (
                <Td key={cell.id} whiteSpace='nowrap' overflow='hidden' textAlign={textAlign}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </Td>
              )
            })}
          </Button>
        )
      },
      [onRowClick, tableRows],
    )

    return (
      <Box ref={parentRef} height='100vh' overflow='auto' sx={tableContainerSx}>
        <Table variant='unstyled' size={tableSizeSx}>
          {isLargerThanMd && (
            <Thead position='sticky' top={0} bg='background.surface' zIndex={1}>
              {table.getHeaderGroups().map(headerGroup => (
                <Tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => {
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
                  })}
                </Tr>
              ))}
            </Thead>
          )}
          <Tbody>
            <Tr height={`${rowVirtualizer.getTotalSize()}px`}>
              <Td colSpan={columns.length} p={0} position='relative'>
                {rowVirtualizer.getVirtualItems().map(virtualRow => renderRow(virtualRow))}
              </Td>
            </Tr>
          </Tbody>
        </Table>
      </Box>
    )
  },
)
