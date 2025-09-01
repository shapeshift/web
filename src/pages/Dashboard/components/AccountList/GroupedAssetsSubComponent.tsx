import { Flex, Stack, useColorModeValue } from '@chakra-ui/react'
import { truncate } from 'lodash'
import { memo, useCallback, useMemo } from 'react'
import { useSelector } from 'react-redux'
import type { Row } from 'react-table'
import { useLongPress } from 'use-long-press'

import { Amount } from '@/components/Amount/Amount'
import { AssetCell } from '@/components/StakingVaults/Cells'
import { defaultLongPressConfig } from '@/constants/longPress'
import { vibrate } from '@/lib/vibrate'
import type { AccountRowData } from '@/state/slices/selectors'
import { selectPortfolioAccountRows } from '@/state/slices/selectors'

type GroupedAccountRowData = AccountRowData & {
  isGrouped?: boolean
  relatedAssetIds?: string[]
}

type RelatedAssetRowProps = {
  assetId: string
  onRowClick: (row: Row<AccountRowData>) => void
  onRowLongPress: (row: Row<AccountRowData>) => void
}

const relatedAssetRowHoverStyles = {
  bg: 'background.surface.raised.base',
}

const RelatedAssetRow = memo<RelatedAssetRowProps>(({ assetId, onRowClick, onRowLongPress }) => {
  const textColor = useColorModeValue('black', 'white')
  const rowData = useSelector(selectPortfolioAccountRows)

  const relatedRow = useMemo(() => rowData.find(r => r.assetId === assetId), [rowData, assetId])

  const handleClick = useCallback(() => {
    vibrate('heavy')
    onRowClick({ original: relatedRow } as Row<AccountRowData>)
  }, [relatedRow, onRowClick])

  const longPressHandlers = useLongPress((_, { context: row }) => {
    vibrate('heavy')
    onRowLongPress?.(row as Row<AccountRowData>)
  }, defaultLongPressConfig)

  if (!relatedRow) return null

  return (
    <Flex
      justify='space-between'
      align='center'
      p={2}
      borderRadius='md'
      cursor='pointer'
      onClick={handleClick}
      _hover={relatedAssetRowHoverStyles}
      {...longPressHandlers()}
    >
      <Flex align='center' gap={3} width='50%'>
        <AssetCell
          assetId={relatedRow.assetId}
          subText={truncate(relatedRow.symbol, { length: 6 })}
        />
      </Flex>
      <Stack spacing={0} fontWeight='medium' textAlign='right'>
        <Amount.Fiat
          fontWeight='semibold'
          color={textColor}
          lineHeight='shorter'
          height='20px'
          value={relatedRow.fiatAmount}
        />
        <Amount.Crypto
          lineHeight='shorter'
          fontWeight='normal'
          fontSize='sm'
          whiteSpace='nowrap'
          value={relatedRow.cryptoAmount}
          symbol={truncate(relatedRow.symbol, { length: 6 })}
          truncateLargeNumbers={true}
        />
      </Stack>
    </Flex>
  )
})

RelatedAssetRow.displayName = 'RelatedAssetRow'

type GroupedAssetsSubComponentProps = {
  row: Row<GroupedAccountRowData>
  onRowClick: (row: Row<AccountRowData>) => void
  onRowLongPress: (row: Row<AccountRowData>) => void
}

export const GroupedAssetsSubComponent = memo<GroupedAssetsSubComponentProps>(
  ({ row, onRowClick, onRowLongPress }) => {
    const groupedRow = row.original as GroupedAccountRowData
    if (!groupedRow.isGrouped || !groupedRow.relatedAssetIds) return null

    return (
      <Stack spacing={2} p={4} bg='background.surface.raised.base'>
        {groupedRow.relatedAssetIds.map(assetId => (
          <RelatedAssetRow
            key={assetId}
            assetId={assetId}
            onRowClick={onRowClick}
            onRowLongPress={onRowLongPress}
          />
        ))}
      </Stack>
    )
  },
)

GroupedAssetsSubComponent.displayName = 'GroupedAssetsSubComponent'
