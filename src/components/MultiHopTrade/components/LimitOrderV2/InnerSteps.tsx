import { ArrowUpDownIcon, CheckCircleIcon, WarningIcon } from '@chakra-ui/icons'
import {
  Box,
  Center,
  Collapse,
  Flex,
  HStack,
  Skeleton,
  Stepper,
  StepStatus,
} from '@chakra-ui/react'
import { SwapperName } from '@shapeshiftoss/swapper'
import type Polyglot from 'node-polyglot'
import { useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { AnimatedCheck } from 'components/AnimatedCheck'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { Text } from 'components/Text'
import { usePlaceLimitOrderMutation } from 'state/apis/limit-orders/limitOrderApi'
import { selectSellAccountId } from 'state/slices/limitOrderInputSlice/selectors'
import { LimitOrderSubmissionState } from 'state/slices/limitOrderSlice/constants'
import {
  selectActiveQuoteId,
  selectActiveQuoteSellAsset,
  selectLimitOrderSubmissionMetadata,
} from 'state/slices/limitOrderSlice/selectors'
import { TransactionExecutionState } from 'state/slices/tradeQuoteSlice/types'
import { useAppSelector, useSelectorWithArgs } from 'state/store'

import { StepperStep } from '../TradeConfirm/StepperStep'
import { TxLabel } from '../TradeConfirm/TxLabel'
import { useStepperSteps } from './hooks/useStepperSteps'

const collapseStyle = { width: '100%' }
const stepProps = { py: 0, pr: 2, pl: 0 }

const erroredStepIndicator = <WarningIcon color='red.500' />
const completedStepIndicator = <CheckCircleIcon color='text.success' />

type InnerStepsProps = {
  isLoading: boolean
}

export const InnerSteps = ({ isLoading }: InnerStepsProps) => {
  const translate = useTranslate()
  const [isExpanded, setIsExpanded] = useState(false)

  const sellAsset = useAppSelector(selectActiveQuoteSellAsset)
  const sellAccountId = useAppSelector(selectSellAccountId)
  const quoteId = useAppSelector(selectActiveQuoteId)

  const { currentLimitOrderStepIndex: currentStep } = useStepperSteps()

  const [_, { data: orderData, error: orderError }] = usePlaceLimitOrderMutation({
    fixedCacheKey: quoteId as string | undefined,
  })

  const orderSubmissionMetadataFilter = useMemo(() => {
    return { quoteId: quoteId ?? 0 }
  }, [quoteId])

  const {
    state: orderSubmissionState,
    allowanceReset,
    allowanceApproval,
    limitOrder,
  } = useSelectorWithArgs(selectLimitOrderSubmissionMetadata, orderSubmissionMetadataFilter)

  const summaryStepIndicator = useMemo(() => {
    switch (true) {
      case !!orderData:
        return (
          <Center boxSize='32px' borderWidth='2px' borderColor='border.base' borderRadius='full'>
            <AnimatedCheck />
          </Center>
        )
      case !!orderError:
        return (
          <Center boxSize='32px' borderWidth='2px' borderColor='border.base' borderRadius='full'>
            <WarningIcon color='red.500' />
          </Center>
        )
      default:
        return (
          <Center boxSize='32px' borderWidth='2px' borderColor='border.base' borderRadius='full'>
            <CircularProgress size='20px' isIndeterminate />
          </Center>
        )
    }
  }, [orderData, orderError])

  const summaryStepProps = useMemo(
    () => ({
      py: 0,
      onClick: () => setIsExpanded(!isExpanded),
      cursor: 'pointer',
      'data-expanded': isExpanded,
    }),
    [isExpanded],
  )

  const titleTranslation: string | [string, number | Polyglot.InterpolationOptions] | null =
    useMemo(() => {
      switch (orderSubmissionState) {
        case LimitOrderSubmissionState.AwaitingAllowanceReset:
          return 'limitOrder.awaitingAllowanceReset'
        case LimitOrderSubmissionState.AwaitingAllowanceApproval:
          return 'limitOrder.awaitingAllowanceApproval'
        case LimitOrderSubmissionState.AwaitingLimitOrderSubmission:
          return ['limitOrder.awaitingOrderPlacement', { swapperName: SwapperName.CowSwap }]
        default:
          return null
      }
    }, [orderSubmissionState])

  const titleElement = useMemo(() => {
    return (
      <Flex alignItems='center' justifyContent='space-between' flex={1} gap={2}>
        <Text translation={titleTranslation} fontWeight='medium' />
        <HStack mr={2}>
          <ArrowUpDownIcon boxSize={3} color='gray.500' />
        </HStack>
      </Flex>
    )
  }, [titleTranslation])

  const stepIndicator = useMemo(
    () => (
      <StepStatus
        complete={completedStepIndicator}
        incomplete={undefined}
        active={orderError ? erroredStepIndicator : undefined}
      />
    ),
    [orderError],
  )

  const allowanceResetTitle = useMemo(() => {
    return (
      <Flex alignItems='center' justifyContent='space-between' flex={1}>
        <Text translation='trade.resetTitle' />
        {allowanceReset.txHash && sellAsset && sellAccountId && (
          <TxLabel
            txHash={allowanceReset.txHash}
            explorerBaseUrl={sellAsset.explorerTxLink}
            accountId={sellAccountId}
            stepSource={undefined} // no swapper base URL here, this is an allowance Tx
            quoteSwapperName={SwapperName.CowSwap}
          />
        )}
      </Flex>
    )
  }, [allowanceReset.txHash, sellAccountId, sellAsset])

  const allowanceApprovalTitle = useMemo(() => {
    return (
      <Flex alignItems='center' justifyContent='space-between' flex={1}>
        <Text translation='trade.approvalTitle' />
        {allowanceApproval.txHash && sellAsset && sellAccountId && (
          <TxLabel
            txHash={allowanceApproval.txHash}
            explorerBaseUrl={sellAsset.explorerTxLink}
            accountId={sellAccountId}
            stepSource={undefined} // no swapper base URL here, this is an allowance Tx
            quoteSwapperName={SwapperName.CowSwap}
          />
        )}
      </Flex>
    )
  }, [allowanceApproval.txHash, sellAccountId, sellAsset])

  return (
    <Skeleton isLoaded={!!orderSubmissionState && !isLoading} width='100%'>
      <StepperStep
        title={titleElement}
        stepIndicator={summaryStepIndicator}
        stepProps={summaryStepProps}
        useSpacer={false}
      />
      <Collapse in={isExpanded} style={collapseStyle}>
        <Box pb={2} px={3}>
          <Stepper variant='innerSteps' orientation='vertical' index={currentStep} gap={0}>
            {allowanceReset.isInitiallyRequired && (
              <StepperStep
                title={allowanceResetTitle}
                stepIndicator={stepIndicator}
                stepProps={stepProps}
                useSpacer={false}
                isError={allowanceReset.state === TransactionExecutionState.Failed}
                stepIndicatorVariant='innerSteps'
              />
            )}
            {allowanceApproval.isInitiallyRequired && (
              <StepperStep
                title={allowanceApprovalTitle}
                stepIndicator={stepIndicator}
                stepProps={stepProps}
                useSpacer={false}
                isError={allowanceApproval.state === TransactionExecutionState.Failed}
                stepIndicatorVariant='innerSteps'
              />
            )}
            <StepperStep
              title={translate('limitOrder.orderPlacement', { swapperName: SwapperName.CowSwap })}
              stepIndicator={stepIndicator}
              stepProps={stepProps}
              useSpacer={false}
              isError={!!orderError || limitOrder.state === TransactionExecutionState.Failed}
              stepIndicatorVariant='innerSteps'
            />
          </Stepper>
        </Box>
      </Collapse>
    </Skeleton>
  )
}
