import type { BoxProps } from '@chakra-ui/react'
import { Box, forwardRef, useColorModeValue } from '@chakra-ui/react'
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

type TxRowProps = {
  txId: string
  activeAsset?: Asset
  showDateAndGuide?: boolean
  useCompactMode?: boolean
  parentWidth: number
  initOpen?: boolean
  disableCollapse?: boolean
} & BoxProps

export const TransactionRow = forwardRef<TxRowProps, 'div'>(
  (
    {
      txId,
      showDateAndGuide = false,
      useCompactMode = false,
      parentWidth,
      initOpen = false,
      disableCollapse = false,
      ...rest
    },
    ref,
  ) => {
    const [isOpen, setIsOpen] = useState(initOpen)
    const toggleOpen = () => (disableCollapse ? null : setIsOpen(!isOpen))
    const rowHoverBg = useColorModeValue('gray.100', 'gray.750')
    const borderColor = useColorModeValue('blackAlpha.100', 'whiteAlpha.100')
    const txDetails = useTxDetails(txId)

    console.log({ txDetails })

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
        _selected={{ bg: rowHoverBg }}
        bg={isOpen ? rowHoverBg : 'transparent'}
        borderColor={isOpen ? borderColor : 'transparent'}
        borderWidth={1}
        ref={ref}
        {...rest}
      >
        {renderTransactionType(txDetails, showDateAndGuide, useCompactMode)}
      </Box>
    )
  },
)
