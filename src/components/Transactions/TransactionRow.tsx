import { Box, useColorModeValue } from '@chakra-ui/react'
import { Asset } from '@shapeshiftoss/types'
import { TradeType, TxType } from '@shapeshiftoss/types/dist/chain-adapters'
import dayjs from 'dayjs'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useRef } from 'react'
import { TransactionContract } from 'components/Transactions/TransactionContract'
import { TransactionGeneric } from 'components/Transactions/TransactionGeneric'
import { TransactionReceive } from 'components/Transactions/TransactionReceive'
import { TransactionSend } from 'components/Transactions/TransactionSend'
import { TransactionTrade } from 'components/Transactions/TransactionTrade'
import { TxDetails, useTxDetails } from 'hooks/useTxDetails/useTxDetails'

dayjs.extend(relativeTime)
dayjs.extend(localizedFormat)

const renderTransactionType = (txDetails: TxDetails): JSX.Element | null => {
  return (() => {
    switch (txDetails.type) {
      case TxType.Send:
        return <TransactionSend txDetails={txDetails} />
      case TxType.Receive:
        return <TransactionReceive txDetails={txDetails} />
      case TradeType.Trade:
        return <TransactionTrade txDetails={txDetails} />
      case TxType.Contract:
        return <TransactionContract txDetails={txDetails} />
      default:
        // Unhandled transaction type - render what a generic row
        return <TransactionGeneric txDetails={txDetails} />
    }
  })()
}

export const TransactionRow = ({ txId, activeAsset }: { txId: string; activeAsset?: Asset }) => {
  const ref = useRef<HTMLHeadingElement>(null)

  const bg = useColorModeValue('gray.50', 'whiteAlpha.100')
  const txDetails = useTxDetails(txId, activeAsset)

  return (
    <Box ref={ref} width='full' pl={3} pr={4} rounded='lg' _hover={{ bg }}>
      {renderTransactionType(txDetails)}
    </Box>
  )
}
