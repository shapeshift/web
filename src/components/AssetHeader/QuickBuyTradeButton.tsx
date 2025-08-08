import { Button } from '@chakra-ui/react'
import type { SupportedTradeQuoteStepIndex, TradeQuoteStep } from '@shapeshiftoss/swapper'
import React, { useCallback, useEffect } from 'react'
import { useTranslate } from 'react-polyglot'

import { useTradeButtonProps } from '../MultiHopTrade/components/TradeConfirm/hooks/useTradeButtonProps'
import { useTradeExecution } from '../MultiHopTrade/components/TradeConfirm/hooks/useTradeExecution'
import { useGetTradeQuotes } from '../MultiHopTrade/hooks/useGetTradeQuotes/useGetTradeQuotes'

import { selectConfirmedTradeExecutionState } from '@/state/slices/tradeQuoteSlice/selectors'
import { TradeExecutionState } from '@/state/slices/tradeQuoteSlice/types'
import { useAppSelector } from '@/state/store'

let done = false
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

  const confirmedTradeExecutionState = useAppSelector(selectConfirmedTradeExecutionState)

  const { data: quoteData } = useGetTradeQuotes()
  console.log(quoteData)

  console.log({ tradeQuoteStep, activeTradeId, currentHopIndex })
  const tradeButtonProps = useTradeButtonProps({
    tradeQuoteStep,
    currentHopIndex,
    activeTradeId,
    isExactAllowance: false, // TODO wtf is this
  })

  const execution = useTradeExecution(currentHopIndex, activeTradeId)

  useEffect(() => {
    console.log({ confirmedTradeExecutionState })
    if (confirmedTradeExecutionState === TradeExecutionState.FirstHop && !done) {
      console.log('EXECUTE')
      done = true
      execution()
    }
  }, [confirmedTradeExecutionState, execution])

  const handleConfirm = useCallback(() => {
    tradeButtonProps?.onSubmit()
    console.log('BAM')
  }, [tradeButtonProps])
  console.log({ tradeButtonProps })

  return (
    <Button
      rounded='full'
      variant='solid'
      size='lg'
      onClick={handleConfirm}
      colorScheme='blue'
      flex={1}
    >
      {translate('common.confirm')}
    </Button>
  )
}
