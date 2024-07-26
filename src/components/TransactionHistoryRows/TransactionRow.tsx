import type { BoxProps } from '@chakra-ui/react'
import { Box, forwardRef, useColorModeValue } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import { TradeType } from '@shapeshiftoss/unchained-client'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useCallback, useMemo, useState } from 'react'
import { TransactionCommon } from 'components/TransactionHistoryRows/TransactionCommon'
import { TransactionMethod } from 'components/TransactionHistoryRows/TransactionMethod'
import { TransactionTrade } from 'components/TransactionHistoryRows/TransactionTrade'
import type { TxDetails } from 'hooks/useTxDetails/useTxDetails'
import { useTxDetails } from 'hooks/useTxDetails/useTxDetails'

dayjs.extend(relativeTime)

export type TransactionRowProps = {
  txDetails: TxDetails
  compactMode: boolean
  isOpen: boolean
  toggleOpen?: () => void
  parentWidth: number
  topRight?: JSX.Element
}

type TxRowProps = {
  txId: string
  activeAsset?: Asset
  useCompactMode?: boolean
  parentWidth: number
  initOpen?: boolean
  disableCollapse?: boolean
  boxProps?: BoxProps
  topRight?: JSX.Element
}

const TransactionType = ({
  txDetails,
  useCompactMode,
  isOpen,
  parentWidth,
  toggleOpen,
  topRight,
}: {
  txDetails: TxDetails
  useCompactMode?: boolean
  isOpen: boolean
  parentWidth: number
  toggleOpen?: () => void
  topRight?: JSX.Element
}): JSX.Element => {
  const props: TransactionRowProps = useMemo(
    () => ({
      txDetails,
      compactMode: useCompactMode ?? false,
      toggleOpen,
      isOpen,
      parentWidth,
      topRight,
    }),
    [isOpen, parentWidth, toggleOpen, txDetails, useCompactMode, topRight],
  )

  switch (txDetails.type) {
    case TradeType.Trade:
    case TradeType.Swap:
    case TradeType.Refund:
      return <TransactionTrade {...props} />
    case 'method':
      return <TransactionMethod {...props} />
    default:
      return <TransactionCommon {...props} />
  }
}

type TransactionRowFromTxDetailsProps = Omit<TxRowProps, 'txId'> & { txDetails: TxDetails }

export const TransactionRowFromTxDetails = forwardRef<TransactionRowFromTxDetailsProps, 'div'>(
  (
    {
      boxProps,
      txDetails,
      useCompactMode,
      parentWidth,
      initOpen = false,
      disableCollapse = false,
      topRight,
    },
    ref,
  ) => {
    const [isOpen, setIsOpen] = useState(initOpen)
    const toggleOpen = useCallback(
      () => (disableCollapse ? undefined : setIsOpen(!isOpen)),
      [disableCollapse, isOpen],
    )

    const borderColor = useColorModeValue('blackAlpha.100', 'whiteAlpha.100')

    const backgroundProps = useMemo(
      () => ({ bg: !disableCollapse ? 'background.surface.hover' : undefined }),
      [disableCollapse],
    )

    return (
      <Box
        width='full'
        rounded='lg'
        _hover={backgroundProps}
        _selected={backgroundProps}
        cursor={!disableCollapse ? 'pointer' : undefined}
        bg={isOpen ? 'background.surface.hover' : 'transparent'}
        borderColor={isOpen ? borderColor : 'transparent'}
        borderWidth={1}
        ref={ref}
        {...boxProps}
      >
        <TransactionType
          txDetails={txDetails}
          useCompactMode={useCompactMode}
          isOpen={isOpen}
          toggleOpen={toggleOpen}
          parentWidth={parentWidth}
          topRight={topRight}
        />
      </Box>
    )
  },
)

export const TransactionRow = forwardRef<TxRowProps, 'div'>((props, ref) => {
  const txDetails = useTxDetails(props.txId)
  return <TransactionRowFromTxDetails ref={ref} {...props} txDetails={txDetails} />
})
