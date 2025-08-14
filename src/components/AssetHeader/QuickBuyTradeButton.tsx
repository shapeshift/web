import { Button } from '@chakra-ui/react'
import type { SupportedTradeQuoteStepIndex, TradeQuoteStep } from '@shapeshiftoss/swapper'
import { isExecutableTradeQuote } from '@shapeshiftoss/swapper'
import React, { useCallback, useEffect, useRef } from 'react'
import { useTranslate } from 'react-polyglot'

import { useTradeButtonProps } from '../MultiHopTrade/components/TradeConfirm/hooks/useTradeButtonProps'
import { useGetTradeQuotes } from '../MultiHopTrade/hooks/useGetTradeQuotes/useGetTradeQuotes'

import {
  selectActiveQuote,
  selectConfirmedTradeExecutionState,
} from '@/state/slices/tradeQuoteSlice/selectors'
import { TradeExecutionState } from '@/state/slices/tradeQuoteSlice/types'
import { useAppSelector } from '@/state/store'

type QuickBuyTradeButtonProps = {
  activeTradeId: string
  tradeQuoteStep: TradeQuoteStep
  currentHopIndex: SupportedTradeQuoteStepIndex
  onConfirm: () => void
}
export const QuickBuyTradeButton: React.FC<QuickBuyTradeButtonProps> = ({
  tradeQuoteStep,
  activeTradeId,
  currentHopIndex,
  onConfirm,
}) => {
  const translate = useTranslate()

  const activeQuoteOrRate = useAppSelector(selectActiveQuote)
  const confirmedTradeExecutionState = useAppSelector(selectConfirmedTradeExecutionState)

  useGetTradeQuotes()

  const tradeButtonProps = useTradeButtonProps({
    tradeQuoteStep,
    currentHopIndex,
    activeTradeId,
    isExactAllowance: false,
  })

  const handleConfirm = useCallback(() => {
    if (!activeQuoteOrRate || !tradeButtonProps) return
    // First click: in Pending state this triggers handleTradeConfirm (creates swap + confirmTrade)
    tradeButtonProps.onSubmit()
    onConfirm()
  }, [activeQuoteOrRate, onConfirm, tradeButtonProps])

  // After confirmTrade, when we reach AwaitingSwap and the executable quote is ready, auto-sign once
  const didAutoSignRef = useRef(false)
  useEffect(() => {
    if (!tradeButtonProps || !activeQuoteOrRate || didAutoSignRef.current) return
    const hasExecutable = isExecutableTradeQuote(activeQuoteOrRate)
    const isAwaitingSwap = confirmedTradeExecutionState === TradeExecutionState.FirstHop
    const canAutoSign = isAwaitingSwap && hasExecutable && !tradeButtonProps.isLoading
    if (!canAutoSign) return
    didAutoSignRef.current = true
    tradeButtonProps.onSubmit() // In AwaitingSwap, onSubmit is handleSignTx
  }, [activeQuoteOrRate, confirmedTradeExecutionState, tradeButtonProps])

  return (
    <Button
      rounded='full'
      variant='solid'
      size='lg'
      onClick={handleConfirm}
      colorScheme='blue'
      flex={1}
      isDisabled={confirmedTradeExecutionState !== TradeExecutionState.Previewing}
      isLoading={confirmedTradeExecutionState !== TradeExecutionState.Previewing}
    >
      {translate('common.confirm')}
    </Button>
  )
}
