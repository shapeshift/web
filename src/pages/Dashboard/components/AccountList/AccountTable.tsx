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
import { range, truncate } from 'lodash'
import { memo, useCallback, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import type { Column, Row } from 'react-table'

import { GroupedAssetsSubComponent } from './GroupedAssetsSubComponent'

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
import type { AccountRowData } from '@/state/slices/selectors'
import {
  selectAssets,
  selectIsPortfolioLoading,
  selectPortfolioAccountRows,
} from '@/state/slices/selectors'
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
  const assets = useSelector(selectAssets)
  const receive = useModal('receive')
  const assetActionsDrawer = useModal('assetActionsDrawer')

  const sortedRows = useMemo(() => {
    return rowData.sort((a, b) => Number(b.fiatAmount) - Number(a.fiatAmount))
  }, [rowData])
  const { hasMore, next, data } = useInfiniteScroll({
    array: sortedRows,
    isScrollable: true,
  })

  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })

  // Group assets by asset type (base symbol/name) for desktop view
  const groupedData = useMemo(() => {
    if (!isLargerThanMd) return data

    const assetGroups = new Map<string, { assets: Asset[]; rows: AccountRowData[] }>()

    data.forEach(row => {
      const asset = assets[row.assetId]
      if (!asset) return

      // Extract base asset name/symbol (remove " on Chain" suffix)
      const baseAssetName = asset.name.split(' on ')[0]
      const baseAssetKey = `${baseAssetName}_${asset.symbol}`

      if (!assetGroups.has(baseAssetKey)) {
        assetGroups.set(baseAssetKey, { assets: [], rows: [] })
      }

      const group = assetGroups.get(baseAssetKey)
      if (!group) return

      group.assets.push(asset)
      group.rows.push(row)
    })

    const grouped: AccountRowData[] = []

    assetGroups.forEach(group => {
      if (group.assets.length > 1) {
        const totalFiatAmount = group.rows.reduce((sum, row) => {
          return sum + Number(row.fiatAmount)
        }, 0)

        const totalCryptoAmount = group.rows.reduce((sum, row) => {
          return sum + Number(row.cryptoAmount)
        }, 0)

        const primaryAsset =
          group.assets.find(asset => !asset.name.includes(' on ')) || group.assets[0]

        const primaryRow = group.rows.find(r => r.assetId === primaryAsset.assetId) || group.rows[0]

        const relatedAssetIds = group.rows.map(row => row.assetId)

        grouped.push({
          ...primaryRow,
          assetId: primaryAsset.assetId, // Use the primary asset ID
          fiatAmount: totalFiatAmount.toString(),
          cryptoAmount: totalCryptoAmount.toString(),
          isGrouped: true,
          relatedAssetIds,
        })
      } else {
        grouped.push(group.rows[0])
      }
    })

    return grouped
  }, [data, assets, isLargerThanMd])

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
        // Virtuoso handles expansion automatically when renderSubComponent is provided
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
      <GroupedAssetsSubComponent
        row={row}
        onRowClick={handleRowClick}
        onRowLongPress={handleRowLongPress}
      />
    ),
    [handleRowClick, handleRowLongPress],
  )

  const accountsAssets = useMemo(() => {
    return rowData.map(row => assets[row.assetId]).filter(isSome)
  }, [rowData, assets])

  if (!isLargerThanMd) {
    return (
      <AssetList
        assets={accountsAssets}
        handleClick={handleAssetClick}
        handleLongPress={handleAssetLongPress}
        height='60vh'
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
      data={groupedData}
      onRowClick={handleRowClick}
      onRowLongPress={handleRowLongPress}
      displayHeaders={isLargerThanMd}
      variant='clickable'
      renderEmptyComponent={renderEmptyComponent}
      renderSubComponent={renderSubComponent}
      hasMore={hasMore}
      loadMore={next}
      scrollableTarget='scroll-view-0'
    />
  )
})
