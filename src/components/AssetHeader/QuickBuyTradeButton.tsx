import { Button } from '@chakra-ui/react'
import type { SupportedTradeQuoteStepIndex, TradeQuoteStep } from '@shapeshiftoss/swapper'
import { isExecutableTradeQuote } from '@shapeshiftoss/swapper'
import React, { useCallback, useEffect, useRef } from 'react'
import { useTranslate } from 'react-polyglot'

import { useTradeButtonProps } from '../MultiHopTrade/components/TradeConfirm/hooks/useTradeButtonProps'
import { useTradeExecution } from '../MultiHopTrade/components/TradeConfirm/hooks/useTradeExecution'
import { useGetTradeQuotes } from '../MultiHopTrade/hooks/useGetTradeQuotes/useGetTradeQuotes'

import {
  selectActiveQuote,
  selectConfirmedTradeExecutionState,
} from '@/state/slices/tradeQuoteSlice/selectors'
import { TradeExecutionState } from '@/state/slices/tradeQuoteSlice/types'
import { useAppSelector } from '@/state/store'

// TODO this button should only render when we're ready to go with an active trade quote and hop steps and whatnot
type QuickBuyTradeButtonProps = {
  activeTradeId: string
  tradeQuoteStep: TradeQuoteStep
  currentHopIndex: SupportedTradeQuoteStepIndex
}
export const QuickBuyTradeButton: React.FC<QuickBuyTradeButtonProps> = ({
  tradeQuoteStep,
  activeTradeId,
  currentHopIndex,
}) => {
  const translate = useTranslate()

  const activeQuote = useAppSelector(selectActiveQuote)
  const confirmedTradeExecutionState = useAppSelector(selectConfirmedTradeExecutionState)

  // Fetch final executable quote only at confirm time; upstream hook handles isFetchStep
  useGetTradeQuotes()

  // console.log({ tradeQuoteStep, activeTradeId, currentHopIndex })
  const tradeButtonProps = useTradeButtonProps({
    tradeQuoteStep,
    currentHopIndex,
    activeTradeId,
    isExactAllowance: false, // TODO wtf is this
  })

  // Disable until we have an executable quote; let the button logic drive enabled state post-confirm
  const combinedDisabled = !activeQuote

  console.log({ activeQuote })

  // console.log({ tradeButtonProps, activeQuote })

  const handleConfirm = useCallback(() => {
    if (combinedDisabled || !tradeButtonProps) return
    // First click: in Pending state this triggers handleTradeConfirm (creates swap + confirmTrade)
    tradeButtonProps.onSubmit()
  }, [combinedDisabled, tradeButtonProps])

  // After confirmTrade, when we reach AwaitingSwap and the executable quote is ready, auto-sign once
  const didAutoSignRef = useRef(false)
  useEffect(() => {
    if (!tradeButtonProps || !activeQuote) return
    console.log('Checking for signable')
    const hasExecutable = isExecutableTradeQuote(activeQuote)
    const isAwaitingSwap = confirmedTradeExecutionState === TradeExecutionState.FirstHop
    console.log({ tradeButtonProps, hasExecutable, isAwaitingSwap, activeQuote })
    const canAutoSign = isAwaitingSwap && hasExecutable && !tradeButtonProps.isLoading
    if (canAutoSign && !didAutoSignRef.current) {
      console.log('AUTO SIGN')
      didAutoSignRef.current = true
      tradeButtonProps.onSubmit() // In AwaitingSwap, onSubmit is handleSignTx
    }
  }, [tradeButtonProps, confirmedTradeExecutionState, activeQuote])

  return (
    <Button
      rounded='full'
      variant='solid'
      size='lg'
      onClick={handleConfirm}
      colorScheme='blue'
      flex={1}
      isDisabled={combinedDisabled}
      isLoading={tradeButtonProps?.isLoading}
    >
      {translate('common.confirm')}
    </Button>
  )
}
