import { Box, useColorModeValue } from '@chakra-ui/react'
import { Asset } from '@shapeshiftoss/types'
import { TradeType, TxType } from '@shapeshiftoss/types/dist/chain-adapters'
import dayjs from 'dayjs'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useRef } from 'react'
import { TransactionContract } from 'components/TransactionHistoryRows/TransactionContract'
import { TransactionReceive } from 'components/TransactionHistoryRows/TransactionReceive'
import { TransactionSend } from 'components/TransactionHistoryRows/TransactionSend'
import { TransactionTrade } from 'components/TransactionHistoryRows/TransactionTrade'
import { TxDetails, useTxDetails } from 'hooks/useTxDetails/useTxDetails'

dayjs.extend(relativeTime)
dayjs.extend(localizedFormat)

const renderTransactionType = (
  txDetails: TxDetails,
  showDateAndGuide: boolean
): JSX.Element | null => {
  return (() => {
    switch (txDetails.type) {
      case TxType.Send:
        return <TransactionSend txDetails={txDetails} showDateAndGuide={showDateAndGuide} />
      case TxType.Receive:
        return <TransactionReceive txDetails={txDetails} showDateAndGuide={showDateAndGuide} />
      case TradeType.Trade:
        return <TransactionTrade txDetails={txDetails} showDateAndGuide={showDateAndGuide} />
      case TxType.Contract:
        return <TransactionContract txDetails={txDetails} showDateAndGuide={showDateAndGuide} />
      default:
        // Unhandled transaction type - don't render anything
        return null
    }
  })()
}

export const TransactionRow = ({
  txId,
  activeAsset,
  showDateAndGuide = false
}: {
  txId: string
  activeAsset?: Asset
  showDateAndGuide?: boolean
}) => {
  const ref = useRef<HTMLHeadingElement>(null)

  const rowHover = useColorModeValue('gray.100', 'gray.750')
  const txDetails = useTxDetails(txId, activeAsset)
  // TODO(0xdef1cafe): support yearn vault deposit withdrawals
  // log what transactions we are currently not parsing so we can update accordingly
  if (!txDetails.type) {
    console.warn('unsupported transaction:', txDetails)
    return null
  }

  return (
    <Box ref={ref} width='full' px={4} rounded='lg' _hover={{ bg: rowHover }}>
      {renderTransactionType(txDetails, showDateAndGuide)}
    </Box>
  )
}
