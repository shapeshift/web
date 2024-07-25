import {
  Box,
  Button,
  Card,
  CircularProgress,
  Divider,
  Icon,
  Link,
  Switch,
  Tooltip,
  VStack,
} from '@chakra-ui/react'
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
import { useAppSelector } from 'state/store'

import { AllowanceType } from '../hooks/helpers'
import { useAllowanceApproval } from '../hooks/useAllowanceApproval'
import { ApprovalStatusIcon } from './StatusIcon'
import { StepperStep } from './StepperStep'

export type ApprovalStepProps = {
  tradeQuoteStep: TradeQuoteStep
  hopIndex: number
  isActive: boolean
  isLastStep?: boolean
  isLoading?: boolean
  isAllowanceResetStep: boolean
  isAwaitingReset?: boolean
}

type ApprovalDescriptionProps = {
  tradeQuoteStep: TradeQuoteStep
  isError: boolean
  txHash: string | undefined
  approvalNetworkFeeCryptoFormatted: string | undefined
  isAllowanceResetStep: boolean
  isAwaitingReset?: boolean
  isLoadingNetworkFee?: boolean
}

const ApprovalDescription = ({
  tradeQuoteStep,
  isError,
  txHash,
  approvalNetworkFeeCryptoFormatted,
  isAllowanceResetStep,
  isAwaitingReset = false,
  isLoadingNetworkFee = false,
}: ApprovalDescriptionProps) => {
  const translate = useTranslate()
  const errorMsg = isError ? (
    <Text
      color='text.error'
      translation={isAllowanceResetStep ? 'trade.approvalResetFailed' : 'trade.approvalFailed'}
      fontWeight='bold'
    />
  ) : null

  if (isAwaitingReset) return null

  if (!txHash) {
    return (
      <>
        {errorMsg}
        {isLoadingNetworkFee
          ? translate(
              isAllowanceResetStep
                ? 'trade.approvalResetGasFeeLoading'
                : 'trade.approvalGasFeeLoading',
            )
          : translate(isAllowanceResetStep ? 'trade.approvalResetGasFee' : 'trade.approvalGasFee', {
              fee: approvalNetworkFeeCryptoFormatted ?? '',
            })}
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
  isAllowanceResetStep,
  isAwaitingReset = false,
}: ApprovalStepProps) => {
  const {
    number: { toCrypto },
  } = useLocaleFormatter()

  const isLifiStep = useMemo(() => {
    return tradeQuoteStep.source.startsWith(SwapperName.LIFI)
  }, [tradeQuoteStep.source])

  // Default to exact allowance for LiFi due to contract vulnerabilities
  const [isExactAllowance, toggleIsExactAllowance] = useToggle(isLifiStep ? true : false)

  const { state, allowanceReset, approval } = useAppSelector(state =>
    selectHopExecutionMetadata(state, hopIndex),
  )

  const allowanceType = useMemo(() => {
    if (isAllowanceResetStep) return AllowanceType.Reset
    return isExactAllowance ? AllowanceType.Exact : AllowanceType.Unlimited
  }, [isAllowanceResetStep, isExactAllowance])

  // TODO: don't compute if isAwaitingReset is true, as the network fee will not be accurate - more gas is used to go from 0 -> 1 than 1 -> 2
  // This will re-compute the network fee when the allowance is reset to 0
  const {
    executeAllowanceApproval,
    approvalNetworkFeeCryptoBaseUnit,
    isLoading: isAllowanceApprovalLoading,
  } = useAllowanceApproval(tradeQuoteStep, hopIndex, allowanceType, isAwaitingReset)

  const isApprovalStep = useMemo(() => {
    return !isAllowanceResetStep && state === HopExecutionState.AwaitingApproval
  }, [isAllowanceResetStep, state])

  const handleSignAllowanceApproval = useCallback(async () => {
    await executeAllowanceApproval()
  }, [executeAllowanceApproval])

  const feeAsset = useAppSelector(state =>
    selectFeeAssetById(state, tradeQuoteStep.sellAsset.assetId),
  )

  const approvalNetworkFeeCryptoFormatted = useMemo(() => {
    if (!feeAsset) return ''

    if (approvalNetworkFeeCryptoBaseUnit) {
      return toCrypto(
        fromBaseUnit(approvalNetworkFeeCryptoBaseUnit, feeAsset.precision),
        feeAsset.symbol,
      )
    }

    return ''
  }, [approvalNetworkFeeCryptoBaseUnit, feeAsset, toCrypto])

  const stepIndicator = useMemo(() => {
    return (
      <ApprovalStatusIcon
        hopExecutionState={state}
        approvalTxState={isAllowanceResetStep ? allowanceReset.state : approval.state}
        isAllowanceResetStep={isAllowanceResetStep}
      />
    )
  }, [allowanceReset.state, approval.state, isAllowanceResetStep, state])

  const translate = useTranslate()

  const description = useMemo(() => {
    return (
      <ApprovalDescription
        tradeQuoteStep={tradeQuoteStep}
        isError={
          isAllowanceResetStep
            ? allowanceReset.state === TransactionExecutionState.Failed
            : approval.state === TransactionExecutionState.Failed
        }
        txHash={undefined}
        approvalNetworkFeeCryptoFormatted={approvalNetworkFeeCryptoFormatted}
        isAllowanceResetStep={isAllowanceResetStep}
        isAwaitingReset={isAwaitingReset}
        isLoadingNetworkFee={isAllowanceApprovalLoading}
      />
    )
  }, [
    allowanceReset.state,
    approval.state,
    approvalNetworkFeeCryptoFormatted,
    isAllowanceApprovalLoading,
    isAllowanceResetStep,
    isAwaitingReset,
    tradeQuoteStep,
  ])

  const resetAllowanceContent = useMemo(() => {
    return (
      <>
        <Row px={2}>
          <Row.Label display='flex' alignItems='center'>
            <Text color='text.subtle' translation='trade.resetAllowance' />
            <Tooltip label={translate('trade.resetAllowanceTooltip')}>
              <Box ml={1}>
                <Icon as={FaInfoCircle} color='text.subtle' fontSize='0.7em' />
              </Box>
            </Tooltip>
          </Row.Label>
        </Row>
        <Button
          width='full'
          size='sm'
          colorScheme='blue'
          isDisabled={
            isAllowanceApprovalLoading ||
            !isAllowanceResetStep ||
            allowanceReset.state !== TransactionExecutionState.AwaitingConfirmation
          }
          isLoading={isAllowanceApprovalLoading}
          onClick={handleSignAllowanceApproval}
        >
          {allowanceReset.state === TransactionExecutionState.Pending && (
            <CircularProgress isIndeterminate size={2} mr={2} />
          )}
          {translate('common.reset')}
        </Button>
        <Divider />
      </>
    )
  }, [
    allowanceReset.state,
    handleSignAllowanceApproval,
    isAllowanceApprovalLoading,
    isAllowanceResetStep,
    translate,
  ])

  const allowanceContent = useMemo(() => {
    return (
      <>
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
              disabled={
                !isApprovalStep ||
                isLifiStep ||
                isAllowanceApprovalLoading ||
                approval.state !== TransactionExecutionState.AwaitingConfirmation
              }
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
          isDisabled={
            isAllowanceApprovalLoading ||
            !isApprovalStep ||
            approval.state !== TransactionExecutionState.AwaitingConfirmation
          }
          isLoading={isAllowanceApprovalLoading}
          onClick={handleSignAllowanceApproval}
        >
          {approval.state !== TransactionExecutionState.AwaitingConfirmation && (
            <CircularProgress isIndeterminate size={2} mr={2} />
          )}
          {translate('common.approve')}
        </Button>
      </>
    )
  }, [
    approval.state,
    handleSignAllowanceApproval,
    isAllowanceApprovalLoading,
    isApprovalStep,
    isExactAllowance,
    isLifiStep,
    toggleIsExactAllowance,
    translate,
  ])

  const content = useMemo(() => {
    // only render the approval button when the component is active and we don't yet have a tx hash
    if (!isActive) return

    return (
      <Card p='2' width='full'>
        <VStack width='full'>
          {isAllowanceResetStep ? resetAllowanceContent : allowanceContent}
        </VStack>
      </Card>
    )
  }, [allowanceContent, isActive, isAllowanceResetStep, resetAllowanceContent])

  return (
    <StepperStep
      title={translate(isAllowanceResetStep ? 'trade.resetTitle' : 'trade.approvalTitle')}
      description={description}
      stepIndicator={stepIndicator}
      content={content}
      isLastStep={isLastStep}
      isLoading={isLoading}
      isError={
        isAllowanceResetStep
          ? allowanceReset.state === TransactionExecutionState.Failed
          : approval.state === TransactionExecutionState.Failed
      }
      isPending={
        isAllowanceResetStep
          ? allowanceReset.state === TransactionExecutionState.Pending
          : approval.state === TransactionExecutionState.Pending
      }
    />
  )
}

const ApprovalStepComplete = ({
  tradeQuoteStep,
  hopIndex,
  isLastStep,
  isLoading,
  isAllowanceResetStep,
}: ApprovalStepProps) => {
  const translate = useTranslate()
  const { state, allowanceReset, approval } = useAppSelector(state =>
    selectHopExecutionMetadata(state, hopIndex),
  )

  const stepIndicator = useMemo(() => {
    return (
      <ApprovalStatusIcon
        hopExecutionState={state}
        approvalTxState={isAllowanceResetStep ? allowanceReset.state : approval.state}
        isAllowanceResetStep={isAllowanceResetStep}
      />
    )
  }, [allowanceReset.state, approval.state, isAllowanceResetStep, state])

  const description = useMemo(() => {
    return (
      <>
        {isAllowanceResetStep ? (
          <ApprovalDescription
            tradeQuoteStep={tradeQuoteStep}
            isError={allowanceReset.state === TransactionExecutionState.Failed}
            txHash={allowanceReset.txHash}
            approvalNetworkFeeCryptoFormatted={undefined}
            isAllowanceResetStep={isAllowanceResetStep}
          />
        ) : (
          <ApprovalDescription
            tradeQuoteStep={tradeQuoteStep}
            isError={approval.state === TransactionExecutionState.Failed}
            txHash={approval.txHash}
            approvalNetworkFeeCryptoFormatted={undefined}
            isAllowanceResetStep={isAllowanceResetStep}
          />
        )}
      </>
    )
  }, [
    allowanceReset.state,
    allowanceReset.txHash,
    approval.state,
    approval.txHash,
    isAllowanceResetStep,
    tradeQuoteStep,
  ])

  // This should never happen as this should be render for *complete* approvals - but it may
  if (!approval.txHash && !allowanceReset.txHash) return null

  return (
    <StepperStep
      title={translate(isAllowanceResetStep ? 'trade.resetTitle' : 'trade.approvalTitle')}
      description={description}
      stepIndicator={stepIndicator}
      content={undefined}
      isLastStep={isLastStep}
      isLoading={isLoading}
      isError={
        isAllowanceResetStep
          ? allowanceReset.state === TransactionExecutionState.Failed
          : approval.state === TransactionExecutionState.Failed
      }
      isPending={
        isAllowanceResetStep
          ? allowanceReset.state === TransactionExecutionState.Pending
          : approval.state === TransactionExecutionState.Pending
      }
    />
  )
}

export const ApprovalStep = ({
  tradeQuoteStep,
  hopIndex,
  isActive,
  isLastStep,
  isLoading,
  isAllowanceResetStep,
  isAwaitingReset = false,
}: ApprovalStepProps) => {
  const { state } = useAppSelector(state => selectHopExecutionMetadata(state, hopIndex))

  const isComplete = useMemo(() => {
    switch (isAllowanceResetStep) {
      case true:
        return [
          HopExecutionState.AwaitingApproval,
          HopExecutionState.AwaitingSwap,
          HopExecutionState.Complete,
        ].includes(state)
      default:
        return [HopExecutionState.AwaitingSwap, HopExecutionState.Complete].includes(state)
    }
  }, [isAllowanceResetStep, state])

  // separate component for completed states to simplify hook dismount
  return isComplete ? (
    <ApprovalStepComplete
      tradeQuoteStep={tradeQuoteStep}
      hopIndex={hopIndex}
      isActive={isActive}
      isLastStep={isLastStep}
      isLoading={isLoading}
      isAllowanceResetStep={isAllowanceResetStep}
    />
  ) : (
    <ApprovalStepPending
      tradeQuoteStep={tradeQuoteStep}
      hopIndex={hopIndex}
      isActive={isActive}
      isLastStep={isLastStep}
      isLoading={isLoading}
      isAllowanceResetStep={isAllowanceResetStep}
      isAwaitingReset={isAwaitingReset}
    />
  )
}
