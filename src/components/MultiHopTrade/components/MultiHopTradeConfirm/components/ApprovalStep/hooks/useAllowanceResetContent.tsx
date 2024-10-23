import type { TradeQuote, TradeQuoteStep } from '@shapeshiftoss/swapper'
import { fromBaseUnit, isSome } from '@shapeshiftoss/utils'
import { useCallback, useMemo } from 'react'
import { AllowanceType } from 'hooks/queries/useApprovalFees'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { selectFeeAssetById } from 'state/slices/selectors'
import { selectHopExecutionMetadata } from 'state/slices/tradeQuoteSlice/selectors'
import { HopExecutionState, TransactionExecutionState } from 'state/slices/tradeQuoteSlice/types'
import { useAppSelector } from 'state/store'

import { useAllowanceReset } from '../../../hooks/useAllowanceReset'
import { ApprovalContent } from '../components/ApprovalContent'
import { GasEstimateLine } from '../components/GasEstimateLine'
import type { TxLineProps } from '../components/SharedApprovalDescription'
import { SharedApprovalDescription } from '../components/SharedApprovalDescription'

export type UseAllowanceResetContentProps = {
  tradeQuoteStep: TradeQuoteStep
  hopIndex: number
  activeTradeId: TradeQuote['id']
}

export const useAllowanceResetContent = ({
  tradeQuoteStep,
  hopIndex,
  activeTradeId,
}: UseAllowanceResetContentProps) => {
  const {
    number: { toCrypto },
  } = useLocaleFormatter()

  const hopExecutionMetadataFilter = useMemo(() => {
    return {
      tradeId: activeTradeId,
      hopIndex,
    }
  }, [activeTradeId, hopIndex])

  const { state: hopExecutionState, allowanceReset } = useAppSelector(state =>
    selectHopExecutionMetadata(state, hopExecutionMetadataFilter),
  )

  const isEnabled = useMemo(() => {
    return (
      Boolean(allowanceReset.isRequired) &&
      [HopExecutionState.Pending, HopExecutionState.AwaitingAllowanceReset].includes(
        hopExecutionState,
      )
    )
  }, [allowanceReset.isRequired, hopExecutionState])

  const {
    allowanceResetMutation,
    allowanceResetNetworkFeeCryptoBaseUnit,
    isLoading: isAllowanceResetLoading,
  } = useAllowanceReset(
    tradeQuoteStep,
    hopIndex,
    AllowanceType.Reset,
    isEnabled,
    activeTradeId,
    allowanceReset.isInitiallyRequired,
  )

  const handleSignAllowanceReset = useCallback(async () => {
    try {
      await allowanceResetMutation.mutateAsync()
    } catch (error) {
      console.error(error)
    }
  }, [allowanceResetMutation])

  const feeAsset = useAppSelector(state =>
    selectFeeAssetById(state, tradeQuoteStep.sellAsset.assetId),
  )

  const allowanceResetNetworkFeeCryptoFormatted = useMemo(() => {
    if (feeAsset && allowanceResetNetworkFeeCryptoBaseUnit) {
      return toCrypto(
        fromBaseUnit(allowanceResetNetworkFeeCryptoBaseUnit, feeAsset.precision),
        feeAsset.symbol,
      )
    }
  }, [allowanceResetNetworkFeeCryptoBaseUnit, feeAsset, toCrypto])

  const isAllowanceResetButtonDisabled = useMemo(() => {
    const isAwaitingAllowanceReset = hopExecutionState === HopExecutionState.AwaitingAllowanceReset
    const isDisabled =
      isAllowanceResetLoading ||
      !isAwaitingAllowanceReset ||
      allowanceReset.state !== TransactionExecutionState.AwaitingConfirmation

    return isDisabled
  }, [allowanceReset.state, hopExecutionState, isAllowanceResetLoading])

  const content = useMemo(() => {
    if (hopExecutionState !== HopExecutionState.AwaitingAllowanceReset) return
    return (
      <ApprovalContent
        buttonTranslation='common.reset'
        isDisabled={isAllowanceResetButtonDisabled}
        isLoading={isAllowanceResetLoading}
        titleTranslation='trade.resetAllowance'
        tooltipTranslation='trade.resetAllowanceTooltip'
        transactionExecutionState={allowanceReset.state}
        onSubmit={handleSignAllowanceReset}
      />
    )
  }, [
    allowanceReset.state,
    handleSignAllowanceReset,
    hopExecutionState,
    isAllowanceResetButtonDisabled,
    isAllowanceResetLoading,
  ])

  const description = useMemo(() => {
    const txLines = [
      allowanceReset.txHash && {
        nameTranslation: 'trade.allowanceResetTxName',
        txHash: allowanceReset.txHash,
      },
    ].filter(isSome) as Omit<TxLineProps, 'tradeQuoteStep'>[]

    return (
      <SharedApprovalDescription
        tradeQuoteStep={tradeQuoteStep}
        txLines={txLines}
        isError={allowanceReset.state === TransactionExecutionState.Failed}
        errorTranslation='trade.approvalResetFailed'
      >
        {!Boolean(allowanceReset.txHash) ? (
          <GasEstimateLine
            gasFeeLoadingTranslation='trade.approvalResetGasFeeLoading'
            gasFeeTranslation='trade.approvalResetGasFee'
            approvalNetworkFeeCryptoFormatted={allowanceResetNetworkFeeCryptoFormatted}
          />
        ) : null}
      </SharedApprovalDescription>
    )
  }, [
    allowanceReset.state,
    allowanceReset.txHash,
    allowanceResetNetworkFeeCryptoFormatted,
    tradeQuoteStep,
  ])

  return {
    content,
    description,
  }
}
