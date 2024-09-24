import { Switch } from '@chakra-ui/react'
import type { TradeQuote, TradeQuoteStep } from '@shapeshiftoss/swapper'
import { fromBaseUnit, isSome } from '@shapeshiftoss/utils'
import { useCallback, useMemo } from 'react'
import { Text } from 'components/Text'
import { AllowanceType } from 'hooks/queries/useApprovalFees'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { useToggle } from 'hooks/useToggle/useToggle'
import { selectFeeAssetById } from 'state/slices/selectors'
import { selectHopExecutionMetadata } from 'state/slices/tradeQuoteSlice/selectors'
import { HopExecutionState, TransactionExecutionState } from 'state/slices/tradeQuoteSlice/types'
import { useAppSelector } from 'state/store'

import { isPermit2Hop } from '../../../hooks/helpers'
import { useAllowanceApproval } from '../../../hooks/useAllowanceApproval'
import { ApprovalContent } from '../components/ApprovalContent'
import { GasEstimateLine } from '../components/GasEstimateLine'
import type { TxLineProps } from '../components/SharedApprovalDescription'
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

  const isPermit2 = useMemo(() => {
    return isPermit2Hop(tradeQuoteStep)
  }, [tradeQuoteStep])

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
    permit2,
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
    // Permit2 should always have unlimited allowance
    isExactAllowance && !isPermit2 ? AllowanceType.Exact : AllowanceType.Unlimited,
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

    // If this is a Permit2 flow and the approval tx is complete, the app needs to wait until the
    // allowance is reflected on-chain before appearing ready for the next action, so the status
    // should be set back to TransactionExecutionState.AwaitingConfirmation.
    const transactionExecutionState =
      permit2.isRequired && allowanceApproval.state === TransactionExecutionState.Complete
        ? TransactionExecutionState.Pending
        : allowanceApproval.state

    return (
      <ApprovalContent
        buttonTranslation='common.approve'
        isDisabled={isApprovalButtonDisabled}
        isLoading={isAllowanceApprovalLoading}
        titleTranslation='trade.allowance'
        tooltipTranslation={isPermit2 ? 'trade.permit2.tooltip' : 'trade.allowanceTooltip'}
        transactionExecutionState={transactionExecutionState}
        onSubmit={handleSignAllowanceApproval}
        topRightContent={
          // Permit2 should always have unlimited allowance without ability to toggle
          !isPermit2 ? (
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
          ) : undefined
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
    isPermit2,
    permit2.isRequired,
    toggleIsExactAllowance,
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
        isError={allowanceApproval.state === TransactionExecutionState.Failed}
        errorTranslation='trade.approvalFailed'
      >
        {!Boolean(allowanceApproval.txHash) ? (
          <GasEstimateLine
            gasFeeLoadingTranslation='trade.approvalGasFeeLoading'
            gasFeeTranslation='trade.approvalGasFee'
            approvalNetworkFeeCryptoFormatted={approvalNetworkFeeCryptoFormatted}
          />
        ) : null}
      </SharedApprovalDescription>
    )
  }, [
    allowanceApproval.state,
    allowanceApproval.txHash,
    allowanceReset.txHash,
    approvalNetworkFeeCryptoFormatted,
    tradeQuoteStep,
  ])

  return {
    content,
    description,
  }
}
