import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons'
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
import type { Asset } from '@shapeshiftoss/types'
import type { Property } from 'csstype'
import groupBy from 'lodash/groupBy'
import range from 'lodash/range'
import truncate from 'lodash/truncate'
import { memo, useCallback, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import type { Column, Row } from 'react-table'

import { GroupedAccounts } from './GroupedAccounts'

import { LoadingRow } from '@/components/AccountRow/LoadingRow'
import { Amount } from '@/components/Amount/Amount'
import { AssetList } from '@/components/AssetSearch/components/AssetList'
import { InfiniteTable } from '@/components/ReactTable/InfiniteTable'
import { ResultsEmpty } from '@/components/ResultsEmpty'
import { AssetCell } from '@/components/StakingVaults/Cells'
import { Text } from '@/components/Text'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll/useInfiniteScroll'
import { useModal } from '@/hooks/useModal/useModal'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { isSome } from '@/lib/utils'
import { vibrate } from '@/lib/vibrate'
import type { AccountRowData, RowProps } from '@/state/slices/selectors'
import {
  selectAssets,
  selectIsPortfolioLoading,
  selectPortfolioAccountRows,
} from '@/state/slices/selectors'
import { breakpoints } from '@/theme/theme'

const stackTextAlign: ResponsiveValue<Property.TextAlign> = { base: 'right', lg: 'left' }

const buttonWidth = { base: 'full', lg: 'auto' }

const emptyContainerProps: FlexProps = {
  width: 'full',
  px: 0,
}

export const AccountTable = memo(() => {
  const loading = useSelector(selectIsPortfolioLoading)
  const rowData = useSelector(selectPortfolioAccountRows)
  const assets = useSelector(selectAssets)
  const receive = useModal('receive')
  const assetActionsDrawer = useModal('assetActionsDrawer')

  const uniqueRowsAll = useMemo(() => {
    const grouped = groupBy(rowData, row => {
      const asset = assets[row.assetId]
      if (!asset) return row.assetId
      const baseAssetName = asset.name.split(' on ')[0]
      return `${baseAssetName}_${asset.symbol}`
    })

    const groupedResults = Object.values(grouped).map(group => {
      if (group.length === 1) return group[0]

      const totalFiatAmount = group.reduce((sum, row) => sum + Number(row.fiatAmount), 0)
      const totalCryptoAmount = group.reduce((sum, row) => sum + Number(row.cryptoAmount), 0)

      const primaryAsset =
        group.find(r => {
          const a = assets[r.assetId]
          return a && !a.name.includes(' on ')
        }) || group[0]

      return {
        ...primaryAsset,
        fiatAmount: totalFiatAmount.toString(),
        cryptoAmount: totalCryptoAmount.toString(),
        isGrouped: true,
        relatedAssetIds: group.map(r => r.assetId),
      }
    })

    return groupedResults.sort((a, b) => Number(b.fiatAmount) - Number(a.fiatAmount))
  }, [rowData, assets])

  const { hasMore, next, data } = useInfiniteScroll({
    array: uniqueRowsAll,
    isScrollable: true,
  })

  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })

  const textColor = useColorModeValue('black', 'white')
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
            isGrouped={row.original.isGrouped}
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
      {
        Header: '',
        id: 'toggle',
        width: 50,
        Cell: ({ row }: { row: RowProps }) => {
          if (!row.original.isGrouped) return null

          return row.isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />
        },
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
  }, [handleReceiveClick])

  const handleRowClick = useCallback(
    (row: Row<AccountRowData>) => {
      if (row.original.isGrouped) {
        // InfiniteTable handles expansion automatically
        return
      }

      vibrate('heavy')
      const { assetId } = row.original
      const url = assetId ? `/assets/${assetId}` : ''
      navigate(url)
    },
    [navigate],
  )

  const handleAssetClick = useCallback(
    (asset: Asset) => {
      vibrate('heavy')
      const { assetId } = asset
      const url = assetId ? `/assets/${assetId}` : ''
      navigate(url)
    },
    [navigate],
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
    return uniqueRowsAll.map(row => assets[row.assetId]).filter(isSome)
  }, [uniqueRowsAll, assets])

  if (!isLargerThanMd) {
    return (
      <AssetList
        assets={accountsAssets}
        handleClick={handleAssetClick}
        handleLongPress={handleAssetLongPress}
        height='53vh'
        shouldDisplayRelatedAssets
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
      onRowClick={handleRowClick}
      onRowLongPress={handleRowLongPress}
      displayHeaders={isLargerThanMd}
      variant='clickable'
      renderEmptyComponent={renderEmptyComponent}
      renderSubComponent={renderSubComponent}
      hasMore={hasMore}
      loadMore={next}
    />
  )
})
