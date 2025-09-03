import { Flex, Stack, useColorModeValue } from '@chakra-ui/react'
import { truncate } from 'lodash'
import { memo, useCallback } from 'react'
import type { Row } from 'react-table'
import { useLongPress } from 'use-long-press'

import { Amount } from '@/components/Amount/Amount'
import { AssetCell } from '@/components/StakingVaults/Cells'
import { defaultLongPressConfig } from '@/constants/longPress'
import { vibrate } from '@/lib/vibrate'
import type { AccountRowData } from '@/state/slices/selectors'
import { selectGroupedAssetBalances } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type RelatedAssetRowProps = {
  relatedAssetRow: AccountRowData
  onRowClick: (row: Row<AccountRowData>) => void
  onRowLongPress: (row: Row<AccountRowData>) => void
}

const relatedAssetRowHoverStyles = {
  bg: 'background.surface.raised.base',
}

const RelatedAssetRow = memo<RelatedAssetRowProps>(
  ({ relatedAssetRow, onRowClick, onRowLongPress }) => {
    const textColor = useColorModeValue('black', 'white')

    const handleClick = useCallback(() => {
      vibrate('heavy')
      onRowClick({ original: relatedAssetRow } as Row<AccountRowData>)
    }, [relatedAssetRow, onRowClick])

    const longPressHandlers = useLongPress((_, { context: relatedAssetRow }) => {
      vibrate('heavy')
      onRowLongPress?.({ original: relatedAssetRow } as Row<AccountRowData>)
    }, defaultLongPressConfig)

    if (!relatedAssetRow) return null

    return (
      <Flex
        justify='space-between'
        align='center'
        p={2}
        borderRadius='md'
        cursor='pointer'
        onClick={handleClick}
        _hover={relatedAssetRowHoverStyles}
        {...longPressHandlers(relatedAssetRow)}
      >
        <Flex align='center' gap={3} width='50%'>
          <AssetCell
            assetId={relatedAssetRow.assetId}
            subText={truncate(relatedAssetRow.symbol, { length: 6 })}
          />
        </Flex>
        <Stack spacing={0} fontWeight='medium' textAlign='right'>
          <Amount.Fiat
            fontWeight='semibold'
            color={textColor}
            lineHeight='shorter'
            height='20px'
            value={relatedAssetRow.fiatAmount}
          />
          <Amount.Crypto
            lineHeight='shorter'
            fontWeight='normal'
            fontSize='sm'
            whiteSpace='nowrap'
            value={relatedAssetRow.cryptoAmount}
            symbol={truncate(relatedAssetRow.symbol, { length: 6 })}
            truncateLargeNumbers={true}
          />
        </Stack>
      </Flex>
    )
  },
)

type GroupedAccountsProps = {
  row: Row<AccountRowData>
  onRowClick: (row: Row<AccountRowData>) => void
  onRowLongPress: (row: Row<AccountRowData>) => void
}

export const GroupedAccounts = memo<GroupedAccountsProps>(({ row, onRowClick, onRowLongPress }) => {
  const groupedAssetBalances = useAppSelector(state =>
    selectGroupedAssetBalances(state, row.original.assetId),
  )

  if (groupedAssetBalances?.relatedAssets.length === 1) return null

  return (
    <Stack spacing={2} p={4} bg='background.surface.raised.base'>
      {groupedAssetBalances?.relatedAssets.map(asset => (
        <RelatedAssetRow
          key={asset.assetId}
          relatedAssetRow={asset}
          onRowClick={onRowClick}
          onRowLongPress={onRowLongPress}
        />
      ))}
    </Stack>
  )
})
