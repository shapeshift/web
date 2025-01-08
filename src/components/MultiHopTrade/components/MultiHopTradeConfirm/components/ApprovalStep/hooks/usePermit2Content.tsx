import type { TradeQuote, TradeQuoteStep } from '@shapeshiftoss/swapper'
import { isSome } from '@shapeshiftoss/utils'
import type { InterpolationOptions } from 'node-polyglot'
import { useMemo } from 'react'
import { useGetTradeQuotes } from 'components/MultiHopTrade/hooks/useGetTradeQuotes/useGetTradeQuotes'
import {
  selectActiveSwapperName,
  selectHopExecutionMetadata,
} from 'state/slices/tradeQuoteSlice/selectors'
import { HopExecutionState, TransactionExecutionState } from 'state/slices/tradeQuoteSlice/types'
import { useAppSelector } from 'state/store'

import { useSignPermit2 } from '../../../hooks/useSignPermit2'
import { ApprovalContent } from '../components/ApprovalContent'
import type { TxLineProps } from '../components/SharedApprovalDescription'
import { SharedApprovalDescription } from '../components/SharedApprovalDescription'

export type UsePermit2ContentProps = {
  tradeQuoteStep: TradeQuoteStep
  hopIndex: number
  activeTradeId: TradeQuote['id']
}

export const usePermit2Content = ({
  tradeQuoteStep,
  hopIndex,
  activeTradeId,
}: UsePermit2ContentProps) => {
  const hopExecutionMetadataFilter = useMemo(() => {
    return {
      tradeId: activeTradeId,
      hopIndex,
    }
  }, [activeTradeId, hopIndex])

  const {
    state: hopExecutionState,
    permit2,
    allowanceReset,
    allowanceApproval,
  } = useAppSelector(state => selectHopExecutionMetadata(state, hopExecutionMetadataFilter))

  const swapperName = useAppSelector(selectActiveSwapperName)

  const { signPermit2 } = useSignPermit2(tradeQuoteStep, hopIndex, activeTradeId)

  const { isLoading: isTradeQuotesLoading } = useGetTradeQuotes()

  const isButtonDisabled = useMemo(() => {
    const isAwaitingPermit2 = hopExecutionState === HopExecutionState.AwaitingPermit2Eip712Sign
    const isError = permit2.state === TransactionExecutionState.Failed
    const isAwaitingConfirmation = permit2.state === TransactionExecutionState.AwaitingConfirmation
    const isDisabled =
      !isAwaitingPermit2 || !(isError || isAwaitingConfirmation) || isTradeQuotesLoading

    return isDisabled
  }, [hopExecutionState, permit2.state, isTradeQuotesLoading])

  const subHeadingTranslation: [string, InterpolationOptions] = useMemo(() => {
    return ['trade.permit2Allowance.description', { symbol: tradeQuoteStep.sellAsset.symbol }]
  }, [tradeQuoteStep])

  const tooltipTranslation: [string, InterpolationOptions] = useMemo(() => {
    return ['trade.permit2Eip712.tooltip', { swapperName }]
  }, [swapperName])

  const content = useMemo(() => {
    if (hopExecutionState !== HopExecutionState.AwaitingPermit2Eip712Sign) return
    return (
      <ApprovalContent
        buttonTranslation='trade.permit2Eip712.signMessage'
        isDisabled={isButtonDisabled}
        isLoading={
          /* NOTE: No loading state when signature in progress because it's instant */
          isTradeQuotesLoading
        }
        subHeadingTranslation={subHeadingTranslation}
        titleTranslation='trade.permit2Eip712.title'
        tooltipTranslation={tooltipTranslation}
        transactionExecutionState={permit2.state}
        onSubmit={signPermit2}
      />
    )
  }, [
    hopExecutionState,
    isButtonDisabled,
    isTradeQuotesLoading,
    permit2.state,
    signPermit2,
    subHeadingTranslation,
    tooltipTranslation,
  ])

  const description = useMemo(() => {
    const txLines = [
      allowanceReset.txHash && {
        nameTranslation: 'trade.allowanceResetTxName',
        txHash: allowanceReset.txHash,
      },
      allowanceApproval.txHash && {
        nameTranslation: 'trade.allowanceApprovalTxName',
        txHash: allowanceApproval.txHash,
      },
    ].filter(isSome) as Omit<TxLineProps, 'tradeQuoteStep'>[]

    return (
      <SharedApprovalDescription
        tradeQuoteStep={tradeQuoteStep}
        txLines={txLines}
        isError={permit2.state === TransactionExecutionState.Failed}
        errorTranslation='trade.permit2Eip712.error'
      />
    )
  }, [allowanceApproval.txHash, allowanceReset.txHash, permit2.state, tradeQuoteStep])

  return {
    content,
    description,
  }
}
