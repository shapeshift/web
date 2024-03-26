import { Button, Flex, Stack, Tag } from '@chakra-ui/react'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import type { Asset } from '@shapeshiftoss/types'
import { truncate } from 'lodash'
import { useCallback, useMemo } from 'react'
import { RiArrowRightDownFill, RiArrowRightUpFill } from 'react-icons/ri'
import { useHistory } from 'react-router'
import type { Column, Row } from 'react-table'
import { Amount } from 'components/Amount/Amount'
import { Display } from 'components/Display'
import { PageBackButton, PageHeader } from 'components/Layout/Header/PageHeader'
import { ReactTable } from 'components/ReactTable/ReactTable'
import { ReactTableNoPager } from 'components/ReactTable/ReactTableNoPager'
import { AssetCell } from 'components/StakingVaults/Cells'
import { RawText, Text } from 'components/Text'
import { useInfiniteScroll } from 'hooks/useInfiniteScroll/useInfiniteScroll'
import { SparkLine } from 'pages/Buy/components/Sparkline'
import { selectAssetsSortedByMarketCap, selectMarketDataUserCurrency } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

const arrowUp = <RiArrowRightUpFill />
const arrowDown = <RiArrowRightDownFill />

type RowProps = Row<Asset>

export const Markets = () => {
  const history = useHistory()
  const assets = useAppSelector(selectAssetsSortedByMarketCap)
  const marketPrices = useAppSelector(selectMarketDataUserCurrency)
  const { hasMore, next, data } = useInfiniteScroll(assets)
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
      <PageHeader>
        <PageHeader.Left>
          <PageBackButton />
        </PageHeader.Left>
        <PageHeader.Middle>
          <RawText textAlign='center'>Search</RawText>
        </PageHeader.Middle>
      </PageHeader>
      <Stack px={2}>
        <ReactTableNoPager
          columns={columns}
          data={data}
          onRowClick={handleRowClick}
          variant='clickable'
        />
        <Button onClick={next} isDisabled={!hasMore}>
          Load more
        </Button>
      </Stack>
    </>
  )
}
