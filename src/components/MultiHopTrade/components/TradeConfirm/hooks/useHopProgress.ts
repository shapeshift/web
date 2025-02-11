import { useEffect, useMemo } from 'react'
import { selectHopExecutionMetadata } from 'state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { TransactionExecutionState } from 'state/slices/tradeQuoteSlice/types'
import { useAppDispatch, useAppSelector } from 'state/store'

export const useHopProgress = (hopIndex: number | undefined, tradeId: string | undefined) => {
  const dispatch = useAppDispatch()

  const hopExecutionMetadataFilter = useMemo(() => {
    if (!tradeId || hopIndex === undefined) return

    return { tradeId, hopIndex }
  }, [hopIndex, tradeId])

  const hopExecutionMetadata = useAppSelector(state =>
    hopExecutionMetadataFilter
      ? selectHopExecutionMetadata(state, hopExecutionMetadataFilter)
      : undefined,
  )

  useEffect(() => {
    if (!hopExecutionMetadata?.swap.sellTxHash || hopIndex === undefined || !tradeId) return

    if (hopExecutionMetadata.swap.sellTxHash) {
      dispatch(
        tradeQuoteSlice.actions.setHopProgress({
          hopIndex,
          tradeId,
          progress: 50,
          status: 'default',
        }),
      )
    }
  }, [dispatch, hopIndex, tradeId, hopExecutionMetadata?.swap.sellTxHash])

  useEffect(() => {
    if (!hopExecutionMetadata?.swap.sellTxHash || hopIndex === undefined || !tradeId) return

    if (hopExecutionMetadata.swap.state === TransactionExecutionState.Failed) {
      dispatch(
        tradeQuoteSlice.actions.setHopProgress({
          hopIndex,
          tradeId,
          progress: 100,
          status: 'failed',
        }),
      )
    }

    if (hopExecutionMetadata.swap.state === TransactionExecutionState.Complete) {
      dispatch(
        tradeQuoteSlice.actions.setHopProgress({
          hopIndex,
          tradeId,
          progress: 100,
          status: 'complete',
        }),
      )
    }
  }, [
    dispatch,
    hopIndex,
    tradeId,
    hopExecutionMetadata?.swap.sellTxHash,
    hopExecutionMetadata?.swap.state,
  ])

  const progress = useMemo(() => hopExecutionMetadata?.progress, [hopExecutionMetadata])

  return progress
}
