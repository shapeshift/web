import { Box, Button, Card, Icon, Link, Switch, Tooltip, VStack } from '@chakra-ui/react'
import type { TradeQuoteStep } from '@shapeshiftoss/swapper'
import { useCallback, useMemo } from 'react'
import { FaInfoCircle, FaThumbsUp } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { Row } from 'components/Row/Row'
import { Text } from 'components/Text'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { useToggle } from 'hooks/useToggle/useToggle'
import { getTxLink } from 'lib/getTxLink'
import { fromBaseUnit } from 'lib/math'
import { selectFeeAssetById } from 'state/slices/selectors'
import { selectHopExecutionMetadata } from 'state/slices/tradeQuoteSlice/selectors'
import { TransactionExecutionState } from 'state/slices/tradeQuoteSlice/types'
import { store, useAppSelector } from 'state/store'

import { useAllowanceApproval } from '../hooks/useAllowanceApproval'
import { StatusIcon } from './StatusIcon'
import { StepperStep } from './StepperStep'

export type ApprovalStepProps = {
  tradeQuoteStep: TradeQuoteStep
  hopIndex: number
  isActive: boolean
  isLastStep?: boolean
  isLoading?: boolean
}

export const ApprovalStep = ({
  tradeQuoteStep,
  hopIndex,
  isActive,
  isLastStep,
  isLoading,
}: ApprovalStepProps) => {
  const {
    number: { toCrypto },
  } = useLocaleFormatter()

  const [isExactAllowance, toggleIsExactAllowance] = useToggle(false)

  const {
    approval: { txHash, state: approvalTxState },
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
    const defaultIcon = <FaThumbsUp />
    // eslint too stoopid to realize this is inside the context of useMemo already
    // eslint-disable-next-line react-memo/require-usememo
    return <StatusIcon txStatus={approvalTxState} defaultIcon={defaultIcon} />
  }, [approvalTxState])

  const translate = useTranslate()

  const description = useMemo(() => {
    const errorMsg = isError ? (
      <Text color='text.error' translation='trade.approvalFailed' fontWeight='bold' />
    ) : null

    if (!txHash) {
      return (
        <>
          {errorMsg}
          {translate('trade.approvalGasFee', { fee: approvalNetworkFeeCryptoFormatted })}
        </>
      )
    }

    const href = getTxLink({
      name: tradeQuoteStep.source,
      defaultExplorerBaseUrl: tradeQuoteStep.sellAsset.explorerTxLink,
      tradeId: txHash,
    })

    return (
      <>
        {errorMsg}
        <Link isExternal href={href} color='text.link'>
          <MiddleEllipsis value={txHash} />
        </Link>
      </>
    )
  }, [
    approvalNetworkFeeCryptoFormatted,
    isError,
    tradeQuoteStep.sellAsset.explorerTxLink,
    tradeQuoteStep.source,
    translate,
    txHash,
  ])

  const content = useMemo(() => {
    // only render the approval button when the component is active and we don't yet have a tx hash
    if (txHash !== undefined || !isActive) return

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
                disabled={!canAttemptApproval}
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
            isLoading={
              isAllowanceApprovalLoading || approvalTxState === TransactionExecutionState.Pending
            }
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
    toggleIsExactAllowance,
    translate,
    txHash,
  ])

  return (
    <StepperStep
      title='Token allowance approval'
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
