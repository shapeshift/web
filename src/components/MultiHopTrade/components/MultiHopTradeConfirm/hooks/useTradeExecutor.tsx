import { useCallback } from 'react'
import { swappers } from 'state/slices/swappersSlice/swappersSlice'
import { useAppDispatch } from 'state/store'

export const useTradeExecutor = () => {
  const dispatch = useAppDispatch()
  const mockExecute = useCallback(() => {
    // next state
    dispatch(swappers.actions.incrementTradeExecutionState())

    // mock execution of tx
    setTimeout(() => dispatch(swappers.actions.incrementTradeExecutionState()), 3000)
  }, [dispatch])
  const reject = useCallback(() => {
    // TODO(woodenfurniture): rejecting a trade should do the following
    // - present a confirmation modal rendering the resulting amounts etc
    // - if user cancels rejecting, return to current flow
    // - if user confirms rejecting, update UI to show cancelled steps and display resulting amounts
    dispatch(swappers.actions.clear())
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
