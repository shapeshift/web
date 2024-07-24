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

  const { state, allowanceReset, approval } = useAppSelector(state =>
    selectHopExecutionMetadata(state, hopIndex),
  )

  const {
    executeAllowanceApproval,
    approvalNetworkFeeCryptoBaseUnit,
    isLoading: isAllowanceApprovalLoading,
  } = useAllowanceApproval(
    tradeQuoteStep,
    hopIndex,
    isExactAllowance ? AllowanceType.Exact : AllowanceType.Unlimited,
  )

  // TODO: move useAllowanceApproval into a query and skip if reset not required
  const {
    executeAllowanceApproval: executeAllowanceReset,
    approvalNetworkFeeCryptoBaseUnit: allowanceResetNetworkFeeCryptoBaseUnit,
    isLoading: isAllowanceResetLoading,
  } = useAllowanceApproval(tradeQuoteStep, hopIndex, AllowanceType.Reset)

  const isAllowanceResetStep = useMemo(() => {
    return allowanceReset.isRequired && state === HopExecutionState.AwaitingApprovalReset
  }, [allowanceReset, state])

  const isApprovalStep = useMemo(() => {
    return !isAllowanceResetStep && state === HopExecutionState.AwaitingApproval
  }, [isAllowanceResetStep, state])

  const handleSignAllowanceReset = useCallback(async () => {
    if (!isAllowanceResetStep) {
      console.error('attempted to execute in-progress allowance reset')
      return
    }

    await executeAllowanceReset()
  }, [isAllowanceResetStep, executeAllowanceReset])

  const handleSignAllowanceApproval = useCallback(async () => {
    if (!isApprovalStep) {
      console.error('attempted to execute in-progress allowance approval')
      return
    }

    await executeAllowanceApproval()
  }, [isApprovalStep, executeAllowanceApproval])

  const feeAsset = useAppSelector(state =>
    selectFeeAssetById(state, tradeQuoteStep.sellAsset.assetId),
  )

  const approvalNetworkFeeCryptoFormatted = useMemo(() => {
    if (!feeAsset) return ''

    if (isAllowanceResetStep && allowanceResetNetworkFeeCryptoBaseUnit) {
      return toCrypto(
        fromBaseUnit(allowanceResetNetworkFeeCryptoBaseUnit, feeAsset.precision),
        feeAsset.symbol,
      )
    }

    if (isApprovalStep && approvalNetworkFeeCryptoBaseUnit) {
      return toCrypto(
        fromBaseUnit(approvalNetworkFeeCryptoBaseUnit, feeAsset.precision),
        feeAsset.symbol,
      )
    }

    return ''
  }, [
    allowanceResetNetworkFeeCryptoBaseUnit,
    approvalNetworkFeeCryptoBaseUnit,
    feeAsset,
    isAllowanceResetStep,
    isApprovalStep,
    toCrypto,
  ])

  const stepIndicator = useMemo(() => {
    return (
      <ApprovalStatusIcon
        hopExecutionState={state}
        approvalTxState={isAllowanceResetStep ? allowanceReset.state : approval.state}
      />
    )
  }, [allowanceReset.state, approval.state, isAllowanceResetStep, state])

  const translate = useTranslate()

  const description = useMemo(() => {
    return (
      <ApprovalDescription
        tradeQuoteStep={tradeQuoteStep}
        isError={
          allowanceReset.state === TransactionExecutionState.Failed ||
          approval.state === TransactionExecutionState.Failed
        }
        txHash={undefined}
        approvalNetworkFeeCryptoFormatted={approvalNetworkFeeCryptoFormatted}
      />
    )
  }, [allowanceReset, approval, approvalNetworkFeeCryptoFormatted, tradeQuoteStep])

  const content = useMemo(() => {
    // only render the approval button when the component is active and we don't yet have a tx hash
    if (!isActive) return

    return (
      <Card p='2' width='full'>
        <VStack width='full'>
          {allowanceReset.isRequired && (
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
                  isAllowanceResetLoading ||
                  !isAllowanceResetStep ||
                  allowanceReset.state !== TransactionExecutionState.AwaitingConfirmation
                }
                isLoading={isAllowanceResetLoading}
                onClick={handleSignAllowanceReset}
              >
                {allowanceReset.state === TransactionExecutionState.Pending && (
                  <CircularProgress isIndeterminate size={2} mr={2} />
                )}
                {allowanceReset.state === TransactionExecutionState.Complete
                  ? translate('common.success')
                  : translate('common.reset')}
              </Button>
              <Divider />
            </>
          )}
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
        </VStack>
      </Card>
    )
  }, [
    allowanceReset,
    approval,
    isAllowanceResetStep,
    isApprovalStep,
    handleSignAllowanceApproval,
    handleSignAllowanceReset,
    isActive,
    isAllowanceApprovalLoading,
    isAllowanceResetLoading,
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
      isError={
        allowanceReset.state === TransactionExecutionState.Failed ||
        approval.state === TransactionExecutionState.Failed
      }
      isPending={
        allowanceReset.state === TransactionExecutionState.Pending ||
        approval.state === TransactionExecutionState.Pending
      }
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
  const { state, allowanceReset, approval } = useAppSelector(state =>
    selectHopExecutionMetadata(state, hopIndex),
  )

  const stepIndicator = useMemo(() => {
    return <ApprovalStatusIcon hopExecutionState={state} approvalTxState={approval.state} />
  }, [approval, state])

  const description = useMemo(() => {
    return (
      <>
        {allowanceReset.txHash && (
          <ApprovalDescription
            tradeQuoteStep={tradeQuoteStep}
            isError={allowanceReset.state === TransactionExecutionState.Failed}
            txHash={allowanceReset.txHash}
            approvalNetworkFeeCryptoFormatted={undefined}
          />
        )}
        <ApprovalDescription
          tradeQuoteStep={tradeQuoteStep}
          isError={approval.state === TransactionExecutionState.Failed}
          txHash={approval.txHash}
          approvalNetworkFeeCryptoFormatted={undefined}
        />
      </>
    )
  }, [allowanceReset, approval, tradeQuoteStep])

  // This should never happen as this should be render for *complete* approvals - but it may
  if (!approval.txHash) return null

  return (
    <StepperStep
      title={translate('trade.approvalTitle')}
      description={description}
      stepIndicator={stepIndicator}
      content={undefined}
      isLastStep={isLastStep}
      isLoading={isLoading}
      isError={
        allowanceReset.state === TransactionExecutionState.Failed ||
        approval.state === TransactionExecutionState.Failed
      }
      isPending={
        allowanceReset.state === TransactionExecutionState.Pending ||
        approval.state === TransactionExecutionState.Pending
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
