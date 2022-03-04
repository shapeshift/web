import { Box, useColorModeValue } from '@chakra-ui/react'
import { Asset } from '@shapeshiftoss/types'
import { TradeType, TxType } from '@shapeshiftoss/types/dist/chain-adapters'
import dayjs from 'dayjs'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import relativeTime from 'dayjs/plugin/relativeTime'
import { TransactionContract } from 'components/TransactionHistoryRows/TransactionContract'
import { TransactionReceive } from 'components/TransactionHistoryRows/TransactionReceive'
import { TransactionSend } from 'components/TransactionHistoryRows/TransactionSend'
import { TransactionTrade } from 'components/TransactionHistoryRows/TransactionTrade'
import { Direction, TxDetails, useTxDetails } from 'hooks/useTxDetails/useTxDetails'

dayjs.extend(relativeTime)
dayjs.extend(localizedFormat)

const renderTransactionType = (
  txDetails: TxDetails,
  showDateAndGuide: boolean
): JSX.Element | null => {
  return (() => {
    const props = {
      txDetails,
      showDateAndGuide
    }
    switch (txDetails.type) {
      case TxType.Send:
        return <TransactionSend {...props} />
      case TxType.Receive:
        return <TransactionReceive {...props} />
      case TradeType.Trade:
        return <TransactionTrade {...props} />
      case TxType.Contract:
        switch (txDetails.direction) {
          case Direction.Outbound:
            return <TransactionSend {...props} />
          case Direction.Inbound:
            return <TransactionReceive {...props} />
          case Direction.InPlace:
          default:
            return <TransactionContract {...props} />
        }
      default:
        return <TransactionContract {...props} />
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
  const rowHoverBg = useColorModeValue('gray.100', 'gray.750')
  const txDetails = useTxDetails(txId, activeAsset)

  return (
    <Box width='full' px={4} rounded='lg' _hover={{ bg: rowHoverBg }}>
      {renderTransactionType(txDetails, showDateAndGuide)}
    </Box>
  )
}
