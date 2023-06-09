import { Stack, Tag } from '@chakra-ui/react'
import { Text } from 'components/Text'
import type { Transfer } from 'hooks/useTxDetails/useTxDetails'

import { TransferColumn } from './TransferColumn'

type TransfersProps = {
  compactMode?: boolean
  transfers: Transfer[]
}

export const Transfers = ({ compactMode, transfers }: TransfersProps) => {
  return transfers.length > 0 ? (
    <Stack
      spacing={{ base: 4, lg: 4 }}
      py={{ base: 0, lg: compactMode ? 0 : 6 }}
      flex={2}
      width='full'
    >
      <Stack
        width='full'
        alignItems='center'
        direction='row'
        justifyContent={{ base: 'space-between', md: compactMode ? 'space-between' : 'flex-start' }}
      >
        <Text color='gray.500' fontWeight='medium' translation='transactionHistory.transfers' />
        <Tag size='sm'>{transfers.length}</Tag>
      </Stack>
      {transfers.map((transfer, i) => {
        return <TransferColumn key={i} compactMode={compactMode} {...transfer} />
      })}
    </Stack>
  ) : null
}
