import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons'
import type { FlexProps } from '@chakra-ui/react'
import {
  Button,
  Stack,
  Stat,
  StatArrow,
  StatNumber,
  useColorModeValue,
  useMediaQuery,
} from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import range from 'lodash/range'
import truncate from 'lodash/truncate'
import { memo, useCallback, useMemo } from 'react'
import { useSelector } from 'react-redux'
import type { Column, Row } from 'react-table'

import { GroupedAccounts } from './GroupedAccounts'

import { LoadingRow } from '@/components/AccountRow/LoadingRow'
import { Amount } from '@/components/Amount/Amount'
import { AssetList } from '@/components/AssetSearch/components/AssetList'
import { InfiniteTable } from '@/components/ReactTable/InfiniteTable'
import { ResultsEmpty } from '@/components/ResultsEmpty'
import { AssetCell } from '@/components/StakingVaults/Cells'
import { Text } from '@/components/Text'
import { useBrowserRouter } from '@/hooks/useBrowserRouter/useBrowserRouter'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll/useInfiniteScroll'
import { useModal } from '@/hooks/useModal/useModal'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { isSome } from '@/lib/utils'
import { vibrate } from '@/lib/vibrate'
import type { AccountRowData, AccountRowProps } from '@/state/slices/selectors'
import {
  selectAssets,
  selectIsPortfolioLoading,
  selectPrimaryPortfolioAccountRowsSortedByBalance,
} from '@/state/slices/selectors'
import { breakpoints } from '@/theme/theme'

const emptyContainerProps: FlexProps = {
  width: 'full',
  px: 0,
}

type AccountTableProps = {
  forceCompactView?: boolean
}

export const AccountTable = memo(({ forceCompactView = false }: AccountTableProps) => {
  const loading = useSelector(selectIsPortfolioLoading)
  const rowData = useSelector(selectPrimaryPortfolioAccountRowsSortedByBalance)
  const assets = useSelector(selectAssets)
  const receive = useModal('receive')
  const assetActionsDrawer = useModal('assetActionsDrawer')
  const walletDrawer = useModal('walletDrawer')

  const { hasMore, next, data } = useInfiniteScroll({
    array: rowData,
    isScrollable: true,
  })

  const textColor = useColorModeValue('black', 'white')
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })
  const [isLargerThanLg] = useMediaQuery(`(min-width: ${breakpoints['lg']})`, { ssr: false })

  const isCompactCols = !isLargerThanLg || forceCompactView

  const showHeaders = isLargerThanMd && !forceCompactView
  const stackTextAlign = isCompactCols ? 'right' : 'left'
  const buttonWidth = isCompactCols ? 'full' : 'auto'

  const { navigate } = useBrowserRouter()

  const columns: Column<AccountRowData>[] = useMemo(
    () => [
      {
        Header: () => <Text translation='dashboard.portfolio.asset' />,
        accessor: 'assetId',
        disableSortBy: true,
        Cell: ({ row }: { row: AccountRowProps }) => (
          <AssetCell
            isChainSpecific={row.original.isChainSpecific}
            assetId={row.original.assetId}
            subText={truncate(row.original.symbol, { length: 6 })}
          />
        ),
      },
      {
        Header: () => <Text translation='dashboard.portfolio.balance' />,
        accessor: 'fiatAmount',
        id: 'balance',
        justifyContent: isCompactCols ? 'flex-end' : 'flex-start',
        Cell: ({ value, row }: { value: string; row: AccountRowProps }) => (
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
        display: isCompactCols ? 'none' : 'table-cell',
        Cell: ({ value }: { value: string }) => (
          <Amount.Fiat color={textColor} value={value} lineHeight='tall' />
        ),
      },
      {
        Header: () => <Text translation='dashboard.portfolio.priceChange' />,
        accessor: 'priceChange',
        display: isCompactCols ? 'none' : 'table-cell',
        sortType: (a: AccountRowProps, b: AccountRowProps): number =>
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
        display: isCompactCols ? 'none' : 'table-cell',
        Cell: ({ value }: { value: number }) => (
          <Amount.Percent fontWeight='medium' textColor='text.subtle' value={value * 0.01} />
        ),
        sortType: (a: AccountRowProps, b: AccountRowProps): number =>
          bnOrZero(a.original.allocation).gt(bnOrZero(b.original.allocation)) ? 1 : -1,
      },
      {
        Header: '',
        id: 'toggle',
        width: 50,
        Cell: ({ row }: { row: AccountRowProps }) => {
          if (row.original.isChainSpecific) return null

          return row.isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />
        },
      },
    ],
    [isCompactCols, stackTextAlign, textColor],
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
    vibrate('heavy')
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
  }, [buttonWidth, handleReceiveClick])

  const handleRowClick = useCallback(
    (row: Row<AccountRowData>) => {
      if (walletDrawer.isOpen) {
        walletDrawer.close()
      }
      vibrate('heavy')
      const { assetId } = row.original
      const url = assetId ? `/assets/${assetId}` : ''
      navigate(url)
    },
    [navigate, walletDrawer],
  )

  const handlePrimaryRowClick = useCallback(
    (row: Row<AccountRowData>) => {
      if (row.original.relatedAssetKey === row.original.assetId) {
        // InfiniteTable handles expansion automatically
        return
      }

      handleRowClick(row)
    },
    [handleRowClick],
  )

  const handleAssetClick = useCallback(
    (asset: Asset) => {
      if (walletDrawer.isOpen) {
        walletDrawer.close()
      }
      vibrate('heavy')
      const { assetId } = asset
      const url = assetId ? `/assets/${assetId}` : ''
      navigate(url)
    },
    [navigate, walletDrawer],
  )

  const handleRowLongPress = useCallback(
    (row: Row<AccountRowData>) => {
      const { assetId } = row.original
      assetActionsDrawer.open({ assetId })
    },
    [assetActionsDrawer],
  )

  const handleAssetLongPress = useCallback(
    (asset: Asset) => {
      const { assetId } = asset
      assetActionsDrawer.open({ assetId })
    },
    [assetActionsDrawer],
  )

  const renderSubComponent = useCallback(
    (row: Row<AccountRowData>) => (
      <GroupedAccounts row={row} onRowClick={handleRowClick} onRowLongPress={handleRowLongPress} />
    ),
    [handleRowClick, handleRowLongPress],
  )

  const accountsAssets = useMemo(() => {
    return rowData.map(row => assets[row.assetId]).filter(isSome)
  }, [rowData, assets])

  if (!isLargerThanMd || forceCompactView) {
    return (
      <AssetList
        assets={accountsAssets}
        handleClick={handleAssetClick}
        handleLongPress={handleAssetLongPress}
        height={
          forceCompactView
            ? '100%'
            : 'calc(100vh - var(--mobile-header-offset) - env(safe-area-inset-top) - var(--safe-area-inset-top) - 54px)'
        }
        showRelatedAssets
      />
    )
  }

  if (loading) {
    return loadingRows
  }

  return (
    <InfiniteTable
      columns={columns}
      data={data}
      onRowClick={handlePrimaryRowClick}
      onRowLongPress={handleRowLongPress}
      displayHeaders={showHeaders}
      variant='clickable'
      renderEmptyComponent={renderEmptyComponent}
      renderSubComponent={renderSubComponent}
      hasMore={hasMore}
      loadMore={next}
    />
  )
})
