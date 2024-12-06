import {
  selectConfirmedTradeExecutionState,
  selectFirstHop,
  selectLastHop,
} from 'state/slices/tradeQuoteSlice/selectors'
import { TradeExecutionState } from 'state/slices/tradeQuoteSlice/types'
import { useAppSelector } from 'state/store'

import { SharedConfirmBody } from '../SharedConfirm/SharedConfirmBody'
import { EtaStep } from './EtaStep'
import { ExpandableTradeSteps } from './ExpandableTradeSteps'

// TODO: This will be either: the ETA, current step (condensed), or all steps (expanded)
const InnerSteps = () => {
  const confirmedTradeExecutionState = useAppSelector(selectConfirmedTradeExecutionState)

  switch (confirmedTradeExecutionState) {
    case TradeExecutionState.Initializing:
    case TradeExecutionState.Previewing:
      return <EtaStep />
    default:
      return <ExpandableTradeSteps />
  }
}

// TODO: this will be a Shared component (merged into SharedConfirm), taking Hops
export const TradeConfirmBody = () => {
  const tradeQuoteFirstHop = useAppSelector(selectFirstHop)
  const tradeQuoteLastHop = useAppSelector(selectLastHop)

  if (!tradeQuoteFirstHop || !tradeQuoteLastHop) return null

  return (
    <SharedConfirmBody
      InnerSteps={InnerSteps}
      sellAsset={tradeQuoteFirstHop.sellAsset}
      buyAsset={tradeQuoteLastHop.buyAsset}
      sellAmountCryptoBaseUnit={tradeQuoteFirstHop.sellAmountIncludingProtocolFeesCryptoBaseUnit}
      buyAmountCryptoBaseUnit={tradeQuoteLastHop.buyAmountAfterFeesCryptoBaseUnit}
    />
  )
}
