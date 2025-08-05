import type { FlexProps, ResponsiveValue } from '@chakra-ui/react'
import {
  Button,
  Stack,
  Stat,
  StatArrow,
  StatNumber,
  useColorModeValue,
  useMediaQuery,
} from '@chakra-ui/react'
import type { Property } from 'csstype'
import { range, truncate } from 'lodash'
import { memo, useCallback, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import type { Column, Row } from 'react-table'

import { LoadingRow } from '@/components/AccountRow/LoadingRow'
import { Amount } from '@/components/Amount/Amount'
import { MoreActionsDrawer } from '@/components/AssetHeader/MoreActionsDrawer'
import { InfiniteTable } from '@/components/ReactTable/InfiniteTable'
import { ResultsEmpty } from '@/components/ResultsEmpty'
import { AssetCell } from '@/components/StakingVaults/Cells'
import { Text } from '@/components/Text'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll/useInfiniteScroll'
import { useModal } from '@/hooks/useModal/useModal'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import type { AccountRowData } from '@/state/slices/selectors'
import { selectIsPortfolioLoading, selectPortfolioAccountRows } from '@/state/slices/selectors'
import { breakpoints } from '@/theme/theme'

type RowProps = Row<AccountRowData>

const stackTextAlign: ResponsiveValue<Property.TextAlign> = { base: 'right', lg: 'left' }

const buttonWidth = { base: 'full', lg: 'auto' }

const emptyContainerProps: FlexProps = {
  width: 'full',
  px: 0,
}

export const AccountTable = memo(() => {
  const loading = useSelector(selectIsPortfolioLoading)
  const rowData = useSelector(selectPortfolioAccountRows)
  const receive = useModal('receive')
  const [selectedAssetIdForMenu, setSelectedAssetIdForMenu] = useState<string | undefined>()
  const sortedRows = useMemo(() => {
    return rowData.sort((a, b) => Number(b.fiatAmount) - Number(a.fiatAmount))
  }, [rowData])
  const { hasMore, next, data } = useInfiniteScroll({
    array: sortedRows,
    isScrollable: true,
  })
  const textColor = useColorModeValue('black', 'white')
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })
  const navigate = useNavigate()
  const columns: Column<AccountRowData>[] = useMemo(
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
        Header: () => <Text translation='dashboard.portfolio.balance' />,
        accessor: 'fiatAmount',
        id: 'balance',
        justifyContent: { base: 'flex-end', lg: 'flex-start' },
        Cell: ({ value, row }: { value: string; row: RowProps }) => (
          <Stack spacing={0} fontWeight='medium' textAlign={stackTextAlign}>
            <Amount.Fiat
              fontWeight='semibold'
              color={textColor}
              lineHeight='shorter'
              height='20px'
              value={value}
            />
            <Amount.Crypto
              lineHeight='shorter'
              fontWeight='normal'
              fontSize='sm'
              whiteSpace='nowrap'
              data-test={`account-row-asset-crypto-${row.original.symbol}`}
              value={row.original.cryptoAmount}
              symbol={truncate(row.original.symbol, { length: 6 })}
              truncateLargeNumbers={true}
            />
          </Stack>
        ),
      },
      {
        Header: () => <Text translation='dashboard.portfolio.price' />,
        accessor: 'price',
        isNumeric: true,
        display: { base: 'none', lg: 'table-cell' },
        Cell: ({ value }: { value: string }) => (
          <Amount.Fiat color={textColor} value={value} lineHeight='tall' />
        ),
      },
      {
        Header: () => <Text translation='dashboard.portfolio.priceChange' />,
        accessor: 'priceChange',
        display: { base: 'none', lg: 'table-cell' },
        sortType: (a: RowProps, b: RowProps): number =>
          bnOrZero(a.original.priceChange).gt(bnOrZero(b.original.priceChange)) ? 1 : -1,
        Cell: ({ value }: { value: number }) => (
          <Stat>
            <StatNumber
              fontSize='md'
              display='flex'
              lineHeight='shorter'
              alignItems='center'
              color={value > 0 ? 'green.500' : 'red.500'}
            >
              <StatArrow ml={1} type={value > 0 ? 'increase' : 'decrease'} />
              <Amount.Percent value={value * 0.01} />
            </StatNumber>
          </Stat>
        ),
      },
      {
        Header: () => <Text textAlign='right' translation='dashboard.portfolio.allocation' />,
        accessor: 'allocation',
        display: { base: 'none', lg: 'table-cell' },
        Cell: ({ value }: { value: number }) => (
          <Amount.Percent fontWeight='medium' textColor='text.subtle' value={value * 0.01} />
        ),
        sortType: (a: RowProps, b: RowProps): number =>
          bnOrZero(a.original.allocation).gt(bnOrZero(b.original.allocation)) ? 1 : -1,
      },
    ],
    [textColor],
  )
  const loadingRows = useMemo(() => {
    return (
      <Stack>
        {range(5).map(index => (
          <LoadingRow key={index} />
        ))}
      </Stack>
    )
  }, [])

  const handleReceiveClick = useCallback(() => {
    receive.open({})
  }, [receive])

  const renderEmptyComponent = useCallback(() => {
    return (
      <ResultsEmpty
        title='dashboard.portfolio.empty.title'
        body='dashboard.portfolio.empty.body'
        containerProps={emptyContainerProps}
      >
        <Button
          size='lg'
          colorScheme='blue'
          onClick={handleReceiveClick}
          mt={4}
          width={buttonWidth}
        >
          <Text translation='dashboard.portfolio.empty.cta' />
        </Button>
      </ResultsEmpty>
    )
  }, [handleReceiveClick])

  const handleRowClick = useCallback(
    (row: Row<AccountRowData>) => {
      const { assetId } = row.original
      const url = assetId ? `/assets/${assetId}` : ''
      navigate(url)
    },
    [navigate],
  )

  const handleRowLongPress = useCallback((row: Row<AccountRowData>) => {
    const { assetId } = row.original
    setSelectedAssetIdForMenu(assetId)
  }, [])

  const handleCloseAssetMenu = useCallback(() => setSelectedAssetIdForMenu(undefined), [])

  return loading ? (
    loadingRows
  ) : (
    <>
      <InfiniteTable
        columns={columns}
        data={data}
        onRowClick={handleRowClick}
        onRowLongPress={handleRowLongPress}
        displayHeaders={isLargerThanMd}
        variant='clickable'
        renderEmptyComponent={renderEmptyComponent}
        hasMore={hasMore}
        loadMore={next}
        scrollableTarget='scroll-view-0'
      />
      <MoreActionsDrawer
        assetId={selectedAssetIdForMenu}
        isOpen={selectedAssetIdForMenu !== undefined}
        onClose={handleCloseAssetMenu}
      />
    </>
  )
})
