import { Stack, Tag } from '@chakra-ui/react'
import { useMemo } from 'react'
import { Text } from 'components/Text'
import type { Transfer } from 'hooks/useTxDetails/useTxDetails'

import { TransferColumn } from './TransferColumn'

type TransfersProps = {
  compactMode?: boolean
  transfers: Transfer[]
}

const stackSpacing = { base: 4, lg: 4 }

export const Transfers = ({ compactMode, transfers }: TransfersProps) => {
  const stackPaddingY = useMemo(() => ({ base: 0, lg: compactMode ? 0 : 6 }), [compactMode])
  const stackJustifyContent = useMemo(
    () => ({
      base: 'space-between',
      md: compactMode ? 'space-between' : 'flex-start',
    }),
    [compactMode],
  )

  return transfers.length > 0 ? (
    <Stack spacing={stackSpacing} py={stackPaddingY} flex={2} width='full'>
      <Stack width='full' alignItems='center' direction='row' justifyContent={stackJustifyContent}>
        <Text color='text.subtle' fontWeight='medium' translation='transactionHistory.transfers' />
        <Tag size='sm'>{transfers.length}</Tag>
      </Stack>
      {transfers.map((transfer, i) => {
        return <TransferColumn key={i} compactMode={compactMode} {...transfer} />
      })}
    </Stack>
  ) : null
}
