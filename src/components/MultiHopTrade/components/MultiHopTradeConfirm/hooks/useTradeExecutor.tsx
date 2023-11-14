import { useCallback } from 'react'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { useAppDispatch } from 'state/store'

export const useTradeExecutooor = () => {
  const dispatch = useAppDispatch()
  const mockExecute = useCallback(() => {
    // next state
    dispatch(tradeQuoteSlice.actions.incrementTradeExecutionState())

    // mock execution of tx
    setTimeout(() => dispatch(tradeQuoteSlice.actions.incrementTradeExecutionState()), 3000)
  }, [dispatch])
  const reject = useCallback(() => {
    // TODO(woodenfurniture): rejecting a trade should do the following
    // - present a confirmation modal rendering the resulting amounts etc
    // - if user cancels rejecting, return to current flow
    // - if user confirms rejecting, update UI to show cancelled steps and display resulting amounts
    dispatch(tradeQuoteSlice.actions.clear())
  }, [dispatch])
  const onSignApproval = mockExecute
  const onRejectApproval = reject
  const onSignTrade = mockExecute
  const onRejectTrade = reject

  return {
    onSignApproval,
    onRejectApproval,
    onSignTrade,
    onRejectTrade,
  }
}
