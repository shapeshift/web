import { CheckCircleIcon } from '@chakra-ui/icons'
import { Box, Button, Card, Center, Icon, Link, Switch, Tooltip, VStack } from '@chakra-ui/react'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useCallback, useMemo, useState } from 'react'
import { FaInfoCircle, FaThumbsUp } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { Row } from 'components/Row/Row'
import { Text } from 'components/Text'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { useToggle } from 'hooks/useToggle/useToggle'
import { getTxLink } from 'lib/getTxLink'
import { fromBaseUnit } from 'lib/math'
import type { TradeQuoteStep } from 'lib/swapper/types'
import { selectFeeAssetById } from 'state/slices/selectors'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { HOP_EXECUTION_STATE_ORDERED, HopExecutionState } from 'state/slices/tradeQuoteSlice/types'
import { store, useAppDispatch } from 'state/store'

import { useMockAllowanceApproval } from '../hooks/mockHooks'
import { StatusIcon } from './StatusIcon'
import { StepperStep } from './StepperStep'

export type ApprovalStepProps = {
  tradeQuoteStep: TradeQuoteStep
  isActive: boolean
  hopExecutionState: HopExecutionState
  isLastStep?: boolean
  isLoading?: boolean
  onError: () => void
}

export const ApprovalStep = ({
  tradeQuoteStep,
  isActive,
  hopExecutionState,
  isLastStep,
  isLoading,
  onError: handleError,
}: ApprovalStepProps) => {
  const {
    number: { toCrypto },
  } = useLocaleFormatter()
  const dispatch = useAppDispatch()
  const [isExactAllowance, toggleIsExactAllowance] = useToggle(false)
  const [isError, setIsError] = useState<boolean>(false)

  const {
    executeAllowanceApproval,
    approvalTxId: txHash,
    approvalTxStatus: _approvalTxStatus,
    approvalNetworkFeeCryptoBaseUnit,
  } = useMockAllowanceApproval(tradeQuoteStep, true, isExactAllowance) // TODO: use the real hook here

  const handleSignAllowanceApproval = useCallback(async () => {
    // next state
    dispatch(tradeQuoteSlice.actions.incrementTradeExecutionState())

    // execute the allowance approval
    const finalTxStatus = await executeAllowanceApproval()

    // next state if trade was successful
    if (finalTxStatus === TxStatus.Confirmed) {
      dispatch(tradeQuoteSlice.actions.incrementTradeExecutionState())
    } else if (finalTxStatus === TxStatus.Failed) {
      setIsError(true)
      handleError()
    }
  }, [dispatch, executeAllowanceApproval, handleError])

  const feeAsset = selectFeeAssetById(store.getState(), tradeQuoteStep.sellAsset.assetId)
  const approvalNetworkFeeCryptoFormatted =
    feeAsset && approvalNetworkFeeCryptoBaseUnit
      ? toCrypto(
          fromBaseUnit(approvalNetworkFeeCryptoBaseUnit, feeAsset.precision),
          feeAsset.symbol,
        )
      : ''

  // the txStatus needs to be undefined before the tx is executed to handle "ready" but not "executing" status
  const txStatus =
    HOP_EXECUTION_STATE_ORDERED.indexOf(hopExecutionState) >=
    HOP_EXECUTION_STATE_ORDERED.indexOf(HopExecutionState.AwaitingApprovalExecution)
      ? _approvalTxStatus
      : undefined

  const stepIndicator = useMemo(
    () =>
      txStatus !== undefined ? (
        <StatusIcon txStatus={txStatus} />
      ) : (
        <Center fontSize='sm'>
          <FaThumbsUp />
        </Center>
      ),
    [txStatus],
  )

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

  const leftIcon = useMemo(() => <CheckCircleIcon />, [])

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
            leftIcon={leftIcon}
            colorScheme='blue'
            isLoading={hopExecutionState === HopExecutionState.AwaitingApprovalExecution}
            onClick={handleSignAllowanceApproval}
          >
            {translate('common.approve')}
          </Button>
        </VStack>
      </Card>
    )
  }, [
    handleSignAllowanceApproval,
    hopExecutionState,
    isActive,
    isExactAllowance,
    leftIcon,
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
      isError={txStatus === TxStatus.Failed}
    />
  )
}
