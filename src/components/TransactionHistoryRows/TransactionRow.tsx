import { Box, useColorModeValue } from '@chakra-ui/react'
import { Asset } from '@shapeshiftoss/types'
import { TradeType, TxType } from '@shapeshiftoss/types/dist/chain-adapters'
import dayjs from 'dayjs'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import relativeTime from 'dayjs/plugin/relativeTime'
import { MutableRefObject, useEffect, useRef, useState } from 'react'
import { TransactionContract } from 'components/TransactionHistoryRows/TransactionContract'
import { TransactionReceive } from 'components/TransactionHistoryRows/TransactionReceive'
import { TransactionSend } from 'components/TransactionHistoryRows/TransactionSend'
import { TransactionTrade } from 'components/TransactionHistoryRows/TransactionTrade'
import { UnknownTransaction } from 'components/TransactionHistoryRows/UnknownTransaction'
import { TxDetails, useTxDetails } from 'hooks/useTxDetails/useTxDetails'

dayjs.extend(relativeTime)
dayjs.extend(localizedFormat)

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
  parentWidth
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
  const rowActiveBg = useColorModeValue('gray.50', 'blackAlpha.300')
  const txDetails = useTxDetails(txId, activeAsset)

  const renderTransactionType = (
    txDetails: TxDetails,
    showDateAndGuide: boolean,
    useCompactMode: boolean
  ): JSX.Element => {
    const props: TransactionRowProps = {
      txDetails,
      showDateAndGuide,
      compactMode: useCompactMode,
      toggleOpen,
      isOpen,
      parentWidth
    }
    switch (txDetails.type || txDetails.direction) {
      case TxType.Send:
        return <TransactionSend {...props} />
      case TxType.Receive:
        return <TransactionReceive {...props} />
      case TradeType.Trade:
        return <TransactionTrade {...props} />
      case TxType.Contract:
        return <TransactionContract {...props} />
      default:
        return <UnknownTransaction {...props} />
    }
  }
  return (
    <Box
      width='full'
      px={4}
      rounded='lg'
      _hover={{ bg: rowHoverBg }}
      bg={isOpen ? rowActiveBg : 'inherit'}
    >
      {renderTransactionType(txDetails, showDateAndGuide, useCompactMode)}
    </Box>
  )
}
