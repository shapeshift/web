import { Box, Button, Card, Icon, Link, Switch, Tooltip, VStack } from '@chakra-ui/react'
import type { TradeQuoteStep } from '@shapeshiftoss/swapper'
import { SwapperName } from '@shapeshiftoss/swapper'
import { useCallback, useMemo } from 'react'
import { FaInfoCircle } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { Row } from 'components/Row/Row'
import { Text } from 'components/Text'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { useToggle } from 'hooks/useToggle/useToggle'
import { fromBaseUnit } from 'lib/math'
import { selectFeeAssetById } from 'state/slices/selectors'
import { selectHopExecutionMetadata } from 'state/slices/tradeQuoteSlice/selectors'
import { HopExecutionState, TransactionExecutionState } from 'state/slices/tradeQuoteSlice/types'
import { store, useAppSelector } from 'state/store'

import { useAllowanceApproval } from '../hooks/useAllowanceApproval'
import { ApprovalStatusIcon } from './StatusIcon'
import { StepperStep } from './StepperStep'

export type ApprovalStepProps = {
  tradeQuoteStep: TradeQuoteStep
  hopIndex: number
  isActive: boolean
  isLastStep?: boolean
  isLoading?: boolean
}

type ApprovalDescriptionProps = {
  tradeQuoteStep: TradeQuoteStep
  isError: boolean
  txHash: string | undefined
  approvalNetworkFeeCryptoFormatted: string | undefined
}

const ApprovalDescription = ({
  tradeQuoteStep,
  isError,
  txHash,
  approvalNetworkFeeCryptoFormatted,
}: ApprovalDescriptionProps) => {
  const translate = useTranslate()
  const errorMsg = isError ? (
    <Text color='text.error' translation='trade.approvalFailed' fontWeight='bold' />
  ) : null

  if (!txHash) {
    return (
      <>
        {errorMsg}
        {translate('trade.approvalGasFee', { fee: approvalNetworkFeeCryptoFormatted ?? '' })}
      </>
    )
  }

  const href = `${tradeQuoteStep.sellAsset.explorerTxLink}${txHash}`

  return (
    <>
      {errorMsg}
      <Link isExternal href={href} color='text.link'>
        <MiddleEllipsis value={txHash} />
      </Link>
    </>
  )
}

const ApprovalStepPending = ({
  tradeQuoteStep,
  hopIndex,
  isActive,
  isLastStep,
  isLoading,
}: ApprovalStepProps) => {
  const {
    number: { toCrypto },
  } = useLocaleFormatter()

  const isLifiStep = useMemo(() => {
    return tradeQuoteStep.source.startsWith(SwapperName.LIFI)
  }, [tradeQuoteStep.source])

  // Default to exact allowance for LiFi due to contract vulnerabilities
  const [isExactAllowance, toggleIsExactAllowance] = useToggle(isLifiStep ? true : false)

  const {
    state,
    approval: { state: approvalTxState },
  } = useAppSelector(state => selectHopExecutionMetadata(state, hopIndex))

  const isError = useMemo(
    () => approvalTxState === TransactionExecutionState.Failed,
    [approvalTxState],
  )

  const {
    executeAllowanceApproval,
    approvalNetworkFeeCryptoBaseUnit,
    isLoading: isAllowanceApprovalLoading,
  } = useAllowanceApproval(tradeQuoteStep, hopIndex, isExactAllowance)

  const canAttemptApproval = useMemo(
    () =>
      [TransactionExecutionState.AwaitingConfirmation, TransactionExecutionState.Failed].includes(
        approvalTxState,
      ),
    [approvalTxState],
  )

  const handleSignAllowanceApproval = useCallback(async () => {
    if (!canAttemptApproval) {
      console.error('attempted to execute in-progress allowance approval')
      return
    }

    await executeAllowanceApproval()
  }, [canAttemptApproval, executeAllowanceApproval])

  const feeAsset = selectFeeAssetById(store.getState(), tradeQuoteStep.sellAsset.assetId)
  const approvalNetworkFeeCryptoFormatted =
    feeAsset && approvalNetworkFeeCryptoBaseUnit
      ? toCrypto(
          fromBaseUnit(approvalNetworkFeeCryptoBaseUnit, feeAsset.precision),
          feeAsset.symbol,
        )
      : ''

  const stepIndicator = useMemo(() => {
    return <ApprovalStatusIcon hopExecutionState={state} approvalTxState={approvalTxState} />
  }, [approvalTxState, state])

  const translate = useTranslate()

  const description = useMemo(() => {
    return (
      <ApprovalDescription
        tradeQuoteStep={tradeQuoteStep}
        isError={isError}
        txHash={undefined}
        approvalNetworkFeeCryptoFormatted={approvalNetworkFeeCryptoFormatted}
      />
    )
  }, [approvalNetworkFeeCryptoFormatted, isError, tradeQuoteStep])

  const content = useMemo(() => {
    // only render the approval button when the component is active and we don't yet have a tx hash
    if (approvalTxState !== TransactionExecutionState.AwaitingConfirmation || !isActive) return

    return (
      <Card p='2' width='full'>
        <VStack width='full'>
          <Row px={2}>
            <Row.Label display='flex' alignItems='center'>
              <Text color='text.subtle' translation='trade.allowance' />
              <Tooltip label={translate('trade.allowanceTooltip')}>
                <Box ml={1}>
                  <Icon as={FaInfoCircle} color='text.subtle' fontSize='0.7em' />
                </Box>
              </Tooltip>
            </Row.Label>
            <Row.Value textAlign='right' display='flex' alignItems='center'>
              <Text
                color={isExactAllowance ? 'text.subtle' : 'white'}
                translation='trade.unlimited'
                fontWeight='bold'
              />
              <Switch
                size='sm'
                mx={2}
                isChecked={isExactAllowance}
                disabled={!canAttemptApproval || isLifiStep}
                onChange={toggleIsExactAllowance}
              />
              <Text
                color={isExactAllowance ? 'white' : 'text.subtle'}
                translation='trade.exact'
                fontWeight='bold'
              />
            </Row.Value>
          </Row>
          <Button
            width='full'
            size='sm'
            colorScheme='blue'
            disabled={isAllowanceApprovalLoading || !canAttemptApproval}
            isLoading={isAllowanceApprovalLoading}
            onClick={handleSignAllowanceApproval}
          >
            {translate('common.approve')}
          </Button>
        </VStack>
      </Card>
    )
  }, [
    approvalTxState,
    canAttemptApproval,
    handleSignAllowanceApproval,
    isActive,
    isAllowanceApprovalLoading,
    isExactAllowance,
    isLifiStep,
    toggleIsExactAllowance,
    translate,
  ])

  return (
    <StepperStep
      title={translate('trade.approvalTitle')}
      description={description}
      stepIndicator={stepIndicator}
      content={content}
      isLastStep={isLastStep}
      isLoading={isLoading}
      isError={approvalTxState === TransactionExecutionState.Failed}
      isPending={approvalTxState === TransactionExecutionState.Pending}
    />
  )
}

const ApprovalStepComplete = ({
  tradeQuoteStep,
  hopIndex,
  isLastStep,
  isLoading,
}: ApprovalStepProps) => {
  const translate = useTranslate()
  const {
    state,
    approval: { txHash, state: approvalTxState },
  } = useAppSelector(state => selectHopExecutionMetadata(state, hopIndex))

  const isError = useMemo(
    () => approvalTxState === TransactionExecutionState.Failed,
    [approvalTxState],
  )

  const stepIndicator = useMemo(() => {
    return <ApprovalStatusIcon hopExecutionState={state} approvalTxState={approvalTxState} />
  }, [approvalTxState, state])

  const description = useMemo(() => {
    return (
      <ApprovalDescription
        tradeQuoteStep={tradeQuoteStep}
        isError={isError}
        txHash={txHash}
        approvalNetworkFeeCryptoFormatted={undefined}
      />
    )
  }, [isError, tradeQuoteStep, txHash])

  // This should never happen as this should be render for *complete* approvals - but it may
  if (!txHash) return null

  return (
    <StepperStep
      title={translate('trade.approvalTitle')}
      description={description}
      stepIndicator={stepIndicator}
      content={undefined}
      isLastStep={isLastStep}
      isLoading={isLoading}
      isError={approvalTxState === TransactionExecutionState.Failed}
      isPending={approvalTxState === TransactionExecutionState.Pending}
    />
  )
}

export const ApprovalStep = ({
  tradeQuoteStep,
  hopIndex,
  isActive,
  isLastStep,
  isLoading,
}: ApprovalStepProps) => {
  const { state } = useAppSelector(state => selectHopExecutionMetadata(state, hopIndex))

  // separate component for completed states to simplify hook dismount
  if (state === HopExecutionState.AwaitingSwap || state === HopExecutionState.Complete) {
    return (
      <ApprovalStepComplete
        tradeQuoteStep={tradeQuoteStep}
        hopIndex={hopIndex}
        isActive={isActive}
        isLastStep={isLastStep}
        isLoading={isLoading}
      />
    )
  }

  return (
    <ApprovalStepPending
      tradeQuoteStep={tradeQuoteStep}
      hopIndex={hopIndex}
      isActive={isActive}
      isLastStep={isLastStep}
      isLoading={isLoading}
    />
  )
}
