import type { StackDirection } from '@chakra-ui/react'
import { Stack } from '@chakra-ui/react'
import { useMemo } from 'react'

import { Amount } from './Amount'

import { AssetIcon } from '@/components/AssetIcon'
import type { Transfer } from '@/hooks/useTxDetails/useTxDetails'

type TransferColumnProps = {
  compactMode?: boolean
} & Transfer

export const TransferColumn = (transfer: TransferColumnProps) => {
  const stackDirection: StackDirection = useMemo(
    () => ({ base: 'column', lg: transfer.compactMode ? 'column' : 'row' }),
    [transfer.compactMode],
  )
  const stackJustify = useMemo(
    () => ({ base: 4, lg: transfer.compactMode ? 4 : 6 }),
    [transfer.compactMode],
  )

  return (
    <Stack
      direction={stackDirection}
      spacing={stackJustify}
      justifyContent='flex-start'
      textAlign='center'
      p={6}
      width='full'
    >
      <AssetIcon asset={transfer.asset} size='md' />
      <Amount
        value={transfer.value}
        precision={transfer.asset.precision}
        symbol={transfer.asset.symbol}
      />
    </Stack>
  )
}
