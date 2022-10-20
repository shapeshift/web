import { Box, useColorModeValue } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/asset-service'
import { TradeType, TransferType } from '@shapeshiftoss/unchained-client'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useState } from 'react'
import { TransactionMethod } from 'components/TransactionHistoryRows/TransactionMethod'
import { TransactionReceive } from 'components/TransactionHistoryRows/TransactionReceive'
import { TransactionSend } from 'components/TransactionHistoryRows/TransactionSend'
import { TransactionTrade } from 'components/TransactionHistoryRows/TransactionTrade'
import { UnknownTransaction } from 'components/TransactionHistoryRows/UnknownTransaction'
import type { TxDetails } from 'hooks/useTxDetails/useTxDetails'
import { useTxDetails } from 'hooks/useTxDetails/useTxDetails'

dayjs.extend(relativeTime)

export type TransactionRowProps = {
  txDetails: TxDetails
  showDateAndGuide?: boolean
  compactMode: boolean
  isOpen: boolean
  toggleOpen: Function
  parentWidth: number
}

export const TransactionRow = ({
  txId,
  activeAsset,
  showDateAndGuide = false,
  useCompactMode = false,
  parentWidth,
}: {
  txId: string
  activeAsset?: Asset
  showDateAndGuide?: boolean
  useCompactMode?: boolean
  parentWidth: number
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const toggleOpen = () => setIsOpen(!isOpen)
  const rowHoverBg = useColorModeValue('gray.100', 'gray.750')
  const borderColor = useColorModeValue('blackAlpha.100', 'whiteAlpha.100')
  const txDetails = useTxDetails(txId, activeAsset)

  const renderTransactionType = (
    txDetails: TxDetails,
    showDateAndGuide: boolean,
    useCompactMode: boolean,
  ): JSX.Element => {
    const props: TransactionRowProps = {
      txDetails,
      showDateAndGuide,
      compactMode: useCompactMode,
      toggleOpen,
      isOpen,
      parentWidth,
    }

    switch (txDetails.type) {
      case TransferType.Send:
        return <TransactionSend {...props} />
      case TransferType.Receive:
        return <TransactionReceive {...props} />
      case TradeType.Trade:
      case TradeType.Refund:
        return <TransactionTrade {...props} />
      case 'method':
        return <TransactionMethod {...props} />
      default:
        return <UnknownTransaction {...props} />
    }
  }
  return (
    <Box
      width='full'
      rounded='lg'
      _hover={{ bg: rowHoverBg }}
      bg={isOpen ? rowHoverBg : 'transparent'}
      borderColor={isOpen ? borderColor : 'transparent'}
      borderWidth={1}
    >
      {renderTransactionType(txDetails, showDateAndGuide, useCompactMode)}
    </Box>
  )
}
