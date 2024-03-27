import { Button, Flex, Stack, Tag, useMediaQuery } from '@chakra-ui/react'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import type { Asset } from '@shapeshiftoss/types'
import { truncate } from 'lodash'
import { memo, useMemo } from 'react'
import { RiArrowRightDownFill, RiArrowRightUpFill } from 'react-icons/ri'
import { useTranslate } from 'react-polyglot'
import type { Column, Row } from 'react-table'
import { Amount } from 'components/Amount/Amount'
import { Display } from 'components/Display'
import { ReactTableNoPager } from 'components/ReactTable/ReactTableNoPager'
import { AssetCell } from 'components/StakingVaults/Cells'
import { RawText, Text } from 'components/Text'
import { useInfiniteScroll } from 'hooks/useInfiniteScroll/useInfiniteScroll'
import { SparkLine } from 'pages/Buy/components/Sparkline'
import { selectMarketDataUserCurrency } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import { breakpoints } from 'theme/theme'

const arrowUp = <RiArrowRightUpFill />
const arrowDown = <RiArrowRightDownFill />

type RowProps = Row<Asset>

type MarketsTableProps = {
  rows: Asset[]
  onRowClick: (arg: Row<Asset>) => void
}

export const MarketsTable: React.FC<MarketsTableProps> = memo(({ rows, onRowClick }) => {
  const translate = useTranslate()
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })
  const marketPrices = useAppSelector(selectMarketDataUserCurrency)

  const { hasMore, next, data } = useInfiniteScroll(rows)
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
        Header: () => <RawText ml='auto'>Price</RawText>,
        accessor: asset => marketPrices[asset.assetId]?.price ?? '0',
        id: 'price',
        Cell: ({ value, row }: { value: string; row: RowProps }) => {
          const change = bnOrZero(
            marketPrices[row.original.assetId]?.changePercent24Hr ?? '0',
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
        Header: () => <RawText>Change</RawText>,
        accessor: asset => marketPrices[asset.assetId]?.changePercent24Hr ?? '0',
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
        Header: () => <RawText>Volume</RawText>,
        accessor: asset => marketPrices[asset.assetId]?.volume ?? '0',
        display: { base: 'none', lg: 'table-cell' },
        id: 'volume',
        Cell: ({ value }: { value: string }) => <Amount.Fiat fontWeight='semibold' value={value} />,
      },
    ],
    [marketPrices],
  )
  return (
    <Stack px={4} pb={6}>
      <ReactTableNoPager
        columns={columns}
        data={data}
        onRowClick={onRowClick}
        displayHeaders={isLargerThanMd}
        variant='clickable'
      />
      {hasMore && (
        <Button onClick={next} isDisabled={!hasMore}>
          {translate('common.loadMore')}
        </Button>
      )}
    </Stack>
  )
})
