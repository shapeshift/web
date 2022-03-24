import { Stack, Tag } from '@chakra-ui/react'
import { TxTransfer } from '@shapeshiftoss/types/dist/chain-adapters'
import { useTranslate } from 'react-polyglot'
import { RawText } from 'components/Text'

import { TransferColumn } from './TransferCol'

type TransfersProps = {
  compactMode?: boolean
  transfers: TxTransfer[]
}

export const Transfers = ({ compactMode, transfers }: TransfersProps) => {
  const translate = useTranslate()
  return transfers.length > 0 ? (
    <Stack
      spacing={{ base: 4, lg: compactMode ? 4 : 6 }}
      py={{ base: 4, lg: compactMode ? 4 : 6 }}
      flex={2}
      width='full'
    >
      <RawText
        color='gray.500'
        fontWeight='medium'
        fontSize={{ base: 'sm', lg: compactMode ? 'sm' : 'md' }}
      >
        {translate('transactionHistory.transfers')} <Tag>{transfers.length}</Tag>
      </RawText>
      {transfers.map((transfer, i) => {
        return <TransferColumn key={i} compactMode={compactMode} {...transfer} />
      })}
    </Stack>
  ) : null
}
