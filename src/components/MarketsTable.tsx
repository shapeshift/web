import { Button, Flex, Stack, Tag, useMediaQuery } from '@chakra-ui/react'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import type { Asset } from '@shapeshiftoss/types'
import { truncate } from 'lodash'
import { memo, useCallback, useMemo } from 'react'
import { RiArrowRightDownFill, RiArrowRightUpFill } from 'react-icons/ri'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import type { Column, Row } from 'react-table'
import { Amount } from 'components/Amount/Amount'
import { Display } from 'components/Display'
import { ReactTableNoPager } from 'components/ReactTable/ReactTableNoPager'
import { AssetCell } from 'components/StakingVaults/Cells'
import { Text } from 'components/Text'
import { useInfiniteScroll } from 'hooks/useInfiniteScroll/useInfiniteScroll'
import { SparkLine } from 'pages/Buy/components/Sparkline'
import { selectIsMarketDataLoaded, selectMarketDataUserCurrency } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import { breakpoints } from 'theme/theme'

const arrowUp = <RiArrowRightUpFill />
const arrowDown = <RiArrowRightDownFill />

const paddingX = { base: 4, md: 0 }

type RowProps = Row<Asset>

type MarketsTableProps = {
  rows: Asset[]
  onRowClick: (arg: Row<Asset>) => void
}

export const MarketsTable: React.FC<MarketsTableProps> = memo(({ rows, onRowClick }) => {
  const translate = useTranslate()
  const history = useHistory()
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })
  const marketDataUserCurrencyById = useAppSelector(selectMarketDataUserCurrency)
  const isMarketDataLoaded = useAppSelector(selectIsMarketDataLoaded)

  const { hasMore, next, data } = useInfiniteScroll(rows)
  const handleTradeClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation()
      const assetId = e.currentTarget.getAttribute('data-asset-id')
      if (!assetId) return
      history.push(`/trade/${assetId}`)
    },
    [history],
  )
  const columns: Column<Asset>[] = useMemo(
    () => [
      {
        Header: () => <Text translation='dashboard.portfolio.asset' />,
        accessor: 'assetId',
        disableSortBy: true,
        Cell: ({ row }: { row: RowProps }) => (
          <AssetCell
            assetId={row.original.assetId}
            subText={truncate(row.original.symbol, { length: 6 })}
          />
        ),
      },
      {
        id: 'sparkline',
        Cell: ({ row }: { row: RowProps }) => {
          return (
            <Flex justifyContent='center'>
              <SparkLine
                assetId={row.original.assetId}
                themeColor={row.original.color}
                height={35}
              />
            </Flex>
          )
        },
      },
      {
        Header: () => <Text ml='auto' translation='dashboard.portfolio.price' />,
        accessor: asset => marketDataUserCurrencyById[asset.assetId]?.price ?? '0',
        id: 'price',
        Cell: ({ value, row }: { value: string; row: RowProps }) => {
          const change = bnOrZero(
            marketDataUserCurrencyById[row.original.assetId]?.changePercent24Hr ?? '0',
          ).times(0.01)
          const colorScheme = change.isPositive() ? 'green' : 'red'
          const icon = change.isPositive() ? arrowUp : arrowDown
          return (
            <Stack alignItems='flex-end'>
              <Amount.Fiat fontWeight='semibold' value={value} />
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

      {
        Header: () => <Text translation='dashboard.portfolio.priceChange' />,
        accessor: asset => marketDataUserCurrencyById[asset.assetId]?.changePercent24Hr ?? '0',
        display: { base: 'none', lg: 'table-cell' },
        id: 'change',
        Cell: ({ value }: { value: string }) => (
          <Amount.Percent
            fontWeight='semibold'
            value={bnOrZero(value).times(0.01).toString()}
            autoColor
          />
        ),
      },
      {
        Header: () => <Text translation='dashboard.portfolio.volume' />,
        accessor: asset => marketDataUserCurrencyById[asset.assetId]?.volume ?? '0',

        id: 'volume',
        display: { base: 'none', lg: 'table-cell' },
        Cell: ({ value }: { value: string }) => <Amount.Fiat fontWeight='semibold' value={value} />,
      },
      {
        id: 'trade',
        display: { base: 'none', lg: 'table-cell' },
        Cell: ({ row }: { row: RowProps }) => (
          <Button data-asset-id={row.original.assetId} onClick={handleTradeClick}>
            {translate('assets.assetCards.assetActions.trade')}
          </Button>
        ),
      },
    ],
    [handleTradeClick, marketDataUserCurrencyById, translate],
  )
  return (
    <Stack px={paddingX} pb={6}>
      <ReactTableNoPager
        columns={columns}
        data={data}
        onRowClick={onRowClick}
        displayHeaders={isLargerThanMd}
        variant='clickable'
        isLoading={!isMarketDataLoaded}
      />
      {hasMore && (
        <Button onClick={next} isDisabled={!hasMore}>
          {translate('common.loadMore')}
        </Button>
      )}
    </Stack>
  )
})
