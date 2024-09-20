import { Switch } from '@chakra-ui/react'
import type { TradeQuote, TradeQuoteStep } from '@shapeshiftoss/swapper'
import { fromBaseUnit } from '@shapeshiftoss/utils'
import { useCallback, useMemo } from 'react'
import { Text } from 'components/Text'
import { AllowanceType } from 'hooks/queries/useApprovalFees'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { useToggle } from 'hooks/useToggle/useToggle'
import { selectFeeAssetById } from 'state/slices/selectors'
import { selectHopExecutionMetadata } from 'state/slices/tradeQuoteSlice/selectors'
import { HopExecutionState, TransactionExecutionState } from 'state/slices/tradeQuoteSlice/types'
import { useAppSelector } from 'state/store'

import { useAllowanceApproval } from '../../../hooks/useAllowanceApproval'
import { AllowanceApprovalContent } from '../components/ApprovalContent'
import { SharedApprovalDescription } from '../components/SharedApprovalDescription'

export type UseAllowanceApprovalContentProps = {
  tradeQuoteStep: TradeQuoteStep
  hopIndex: number
  activeTradeId: TradeQuote['id']
}

export const useAllowanceApprovalContent = ({
  tradeQuoteStep,
  hopIndex,
  activeTradeId,
}: UseAllowanceApprovalContentProps) => {
  const [isExactAllowance, toggleIsExactAllowance] = useToggle(true)

  const {
    number: { toCrypto },
  } = useLocaleFormatter()

  const hopExecutionMetadataFilter = useMemo(() => {
    return {
      tradeId: activeTradeId,
      hopIndex,
    }
  }, [activeTradeId, hopIndex])

  const {
    state: hopExecutionState,
    allowanceApproval,
    allowanceReset,
  } = useAppSelector(state => selectHopExecutionMetadata(state, hopExecutionMetadataFilter))

  const isEnabled = useMemo(() => {
    return (
      Boolean(allowanceApproval.isRequired) &&
      allowanceApproval.state === TransactionExecutionState.AwaitingConfirmation &&
      !allowanceReset.isRequired // Don't start estimating gas until the reset is no longer required
    )
  }, [allowanceApproval.isRequired, allowanceApproval.state, allowanceReset.isRequired])

  const {
    approveMutation,
    approvalNetworkFeeCryptoBaseUnit,
    isLoading: isAllowanceApprovalLoading,
  } = useAllowanceApproval(
    tradeQuoteStep,
    hopIndex,
    isExactAllowance ? AllowanceType.Exact : AllowanceType.Unlimited,
    isEnabled,
    activeTradeId,
    allowanceApproval.isInitiallyRequired,
  )

  const handleSignAllowanceApproval = useCallback(async () => {
    try {
      await approveMutation.mutateAsync()
    } catch (error) {
      console.error(error)
    }
  }, [approveMutation])

  const feeAsset = useAppSelector(state =>
    selectFeeAssetById(state, tradeQuoteStep.sellAsset.assetId),
  )

  const approvalNetworkFeeCryptoFormatted = useMemo(() => {
    if (feeAsset && approvalNetworkFeeCryptoBaseUnit) {
      return toCrypto(
        fromBaseUnit(approvalNetworkFeeCryptoBaseUnit, feeAsset.precision),
        feeAsset.symbol,
      )
    }
  }, [approvalNetworkFeeCryptoBaseUnit, feeAsset, toCrypto])

  const isApprovalButtonDisabled = useMemo(() => {
    const isAwaitingApproval = hopExecutionState === HopExecutionState.AwaitingAllowanceApproval
    const isDisabled =
      isAllowanceApprovalLoading ||
      !isAwaitingApproval ||
      allowanceApproval.state !== TransactionExecutionState.AwaitingConfirmation

    return isDisabled
  }, [allowanceApproval.state, hopExecutionState, isAllowanceApprovalLoading])

  const content = useMemo(() => {
    if (hopExecutionState !== HopExecutionState.AwaitingAllowanceApproval) return
    return (
      <AllowanceApprovalContent
        buttonTranslation='common.approve'
        isDisabled={isApprovalButtonDisabled}
        isLoading={isAllowanceApprovalLoading}
        titleTranslation='trade.allowance'
        tooltipTranslation='trade.allowanceTooltip'
        transactionExecutionState={allowanceApproval.state}
        onSubmit={handleSignAllowanceApproval}
        topRightContent={
          <>
            <Text
              color={isExactAllowance ? 'text.subtle' : 'white'}
              translation='trade.unlimited'
              fontWeight='bold'
            />
            <Switch
              size='sm'
              mx={2}
              isChecked={isExactAllowance}
              disabled={isApprovalButtonDisabled}
              onChange={toggleIsExactAllowance}
            />
            <Text
              color={isExactAllowance ? 'white' : 'text.subtle'}
              translation='trade.exact'
              fontWeight='bold'
            />
          </>
        }
      />
    )
  }, [
    allowanceApproval.state,
    handleSignAllowanceApproval,
    hopExecutionState,
    isAllowanceApprovalLoading,
    isApprovalButtonDisabled,
    isExactAllowance,
    toggleIsExactAllowance,
  ])

  const description = useMemo(() => {
    return (
      <SharedApprovalDescription
        tradeQuoteStep={tradeQuoteStep}
        approvalNetworkFeeCryptoFormatted={approvalNetworkFeeCryptoFormatted}
        gasFeeLoadingTranslation='trade.approvalGasFeeLoading'
        txHash={allowanceApproval.txHash}
        gasFeeTranslation='trade.approvalGasFee'
        isError={allowanceApproval.state === TransactionExecutionState.Failed}
        errorTranslation='trade.approvalFailed'
      />
    )
  }, [
    allowanceApproval.state,
    allowanceApproval.txHash,
    approvalNetworkFeeCryptoFormatted,
    tradeQuoteStep,
  ])

  return {
    content,
    description,
  }
}
