import { Button, Flex, Stack, Tag, useMediaQuery } from '@chakra-ui/react'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import type { Asset } from '@shapeshiftoss/types'
import { truncate } from 'lodash'
import { matchSorter } from 'match-sorter'
import { useCallback, useMemo, useState } from 'react'
import { RiArrowRightDownFill, RiArrowRightUpFill } from 'react-icons/ri'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import type { Column, Row } from 'react-table'
import { Amount } from 'components/Amount/Amount'
import { Display } from 'components/Display'
import { PageBackButton, PageHeader } from 'components/Layout/Header/PageHeader'
import { ReactTableNoPager } from 'components/ReactTable/ReactTableNoPager'
import { AssetCell } from 'components/StakingVaults/Cells'
import { GlobalFilter } from 'components/StakingVaults/GlobalFilter'
import { RawText, Text } from 'components/Text'
import { useInfiniteScroll } from 'hooks/useInfiniteScroll/useInfiniteScroll'
import { SparkLine } from 'pages/Buy/components/Sparkline'
import { selectAssetsSortedByMarketCap, selectMarketDataUserCurrency } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import { breakpoints } from 'theme/theme'

const arrowUp = <RiArrowRightUpFill />
const arrowDown = <RiArrowRightDownFill />

type RowProps = Row<Asset>

export const Markets = () => {
  const translate = useTranslate()
  const [searchQuery, setSearchQuery] = useState('')
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })
  const history = useHistory()
  const assets = useAppSelector(selectAssetsSortedByMarketCap)
  const marketPrices = useAppSelector(selectMarketDataUserCurrency)
  const isSearching = useMemo(() => searchQuery.length > 0, [searchQuery])

  const filterRowsBySearchTerm = useCallback((rows: Asset[], filterValue: any) => {
    if (!filterValue) return rows
    if (typeof filterValue !== 'string') {
      return []
    }
    const search = filterValue.trim().toLowerCase()
    const matchedAssets = matchSorter(rows, search, {
      keys: ['name', 'symbol'],
      threshold: matchSorter.rankings.CONTAINS,
    })
    return matchedAssets
  }, [])
  const rows = useMemo(() => {
    return isSearching ? filterRowsBySearchTerm(assets, searchQuery) : assets
  }, [assets, filterRowsBySearchTerm, isSearching, searchQuery])
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
      <Display.Mobile>
        <PageHeader>
          <PageHeader.Left>
            <PageBackButton />
          </PageHeader.Left>
          <PageHeader.Middle>
            <RawText textAlign='center'>{translate('navBar.assets')}</RawText>
          </PageHeader.Middle>
          <Flex gridColumn='1 / span 3' order='4' mt={2}>
            <GlobalFilter searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
          </Flex>
        </PageHeader>
      </Display.Mobile>
      <Stack px={4} pb={6}>
        <ReactTableNoPager
          columns={columns}
          data={data}
          onRowClick={handleRowClick}
          displayHeaders={isLargerThanMd}
          variant='clickable'
        />
        {hasMore && (
          <Button onClick={next} isDisabled={!hasMore}>
            Load more
          </Button>
        )}
      </Stack>
    </>
  )
}
