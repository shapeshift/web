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
import type { Range } from '@tanstack/react-virtual'
import { defaultRangeExtractor, useVirtualizer } from '@tanstack/react-virtual'
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
const ROW_VERTICAL_PADDING = 8

const arrowUp = <RiArrowRightUpFill />
const arrowDown = <RiArrowRightDownFill />

const tableSize = { base: 'sm', md: 'md' }
const tableContainerSx = {
  height: '100vh',
  overflow: 'auto',
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
    const rangeRef = useRef({ startIndex: 0, endIndex: 0 })

    const rowVirtualizer = useVirtualizer({
      count: rows.length,
      getScrollElement: () => parentRef.current,
      estimateSize: () => ROW_HEIGHT + ROW_VERTICAL_PADDING,
      overscan: 5,
      rangeExtractor: useCallback((range: Range) => {
        rangeRef.current = range
        return defaultRangeExtractor(range)
      }, []),
    })

    // Only fetch market data for visible rows
    // Do *NOT* memoize me, as it relies on a ref.
    const visibleAssetIds = rows
      .slice(rangeRef.current.startIndex, rangeRef.current.endIndex)
      .map(row => row.assetId)

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
                meta: {
                  textAlign: 'right',
                },
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
                meta: {
                  textAlign: 'right',
                },
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
                meta: {
                  textAlign: 'right',
                },
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

    return (
      <Box ref={parentRef} style={tableContainerSx}>
        <Table variant='unstyled' size={tableSize}>
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
            <tr style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
              <td colSpan={columns.length} style={{ padding: 0, position: 'relative' }}>
                {rowVirtualizer.getVirtualItems().map(virtualRow => {
                  const row = tableRows[virtualRow.index]
                  return (
                    <Button
                      variant='ghost'
                      key={row.id}
                      my={2}
                      onClick={() => onRowClick(row)}
                      position='absolute'
                      top={0}
                      left={0}
                      right={0}
                      display='grid'
                      alignItems='center'
                      height={`${ROW_HEIGHT}px`}
                      py={2}
                      sx={{
                        transform: `translateY(${virtualRow.start}px)`,
                        gridTemplateColumns: {
                          base: '1fr auto',
                          md: '300px 140px minmax(100px, 1fr) minmax(100px, 1fr) minmax(100px, 1fr) 100px',
                        },
                        gap: '4px',
                      }}
                    >
                      {row.getVisibleCells().map(cell => {
                        const textAlign = (() => {
                          if (cell.column.id === 'assetId') return 'left'
                          if (cell.column.id === 'sparkline') return 'center'
                          return 'right'
                        })()
                        return (
                          <Td
                            key={cell.id}
                            px={4}
                            whiteSpace='nowrap'
                            overflow='hidden'
                            textOverflow='ellipsis'
                            textAlign={textAlign}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </Td>
                        )
                      })}
                    </Button>
                  )
                })}
              </td>
            </tr>
          </Tbody>
        </Table>
      </Box>
    )
  },
)
