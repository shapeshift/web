import { CheckCircleIcon, WarningIcon } from '@chakra-ui/icons'
import {
  Box,
  Flex,
  HStack,
  Icon,
  Stepper,
  StepStatus,
  Tag,
  Tooltip,
  usePrevious,
  VStack,
} from '@chakra-ui/react'
import type { TradeQuote, TradeRate } from '@shapeshiftoss/swapper'
import { useCallback, useEffect, useMemo } from 'react'
import { FaInfoCircle } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { RawText, Text } from 'components/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useModal } from 'hooks/useModal/useModal'
import { bn } from 'lib/bignumber/bignumber'
import {
  selectFirstHopSellAccountId,
  selectSecondHopSellAccountId,
} from 'state/slices/tradeInputSlice/selectors'
import {
  selectActiveQuoteErrors,
  selectHopExecutionMetadata,
} from 'state/slices/tradeQuoteSlice/selectors'
import { HopExecutionState, TransactionExecutionState } from 'state/slices/tradeQuoteSlice/types'
import { useAppSelector, useSelectorWithArgs } from 'state/store'

import { StepperStep } from '../helpers'
import { useHopProgress } from '../hooks/useHopProgress'
import { useStepperSteps } from '../hooks/useStepperSteps'
import { useStreamingProgress } from '../hooks/useStreamingProgress'
import { StepperStep as StepperStepComponent } from '../StepperStep'
import { TxLabel } from '../TxLabel'

const erroredStepIndicator = <WarningIcon color='red.500' />
const completedStepIndicator = <CheckCircleIcon color='text.success' />

const stepProps = { py: 0, pr: 2, pl: 0 }

type ExpandedStepperStepsProps = {
  activeTradeQuote: TradeQuote | TradeRate
}

export const ExpandedStepperSteps = ({ activeTradeQuote }: ExpandedStepperStepsProps) => {
  const translate = useTranslate()
  const rateChanged = useModal('rateChanged')
  const firstHopProgress = useHopProgress(0, activeTradeQuote.id)
  const lastHopProgress = useHopProgress(1, activeTradeQuote.id)
  // this is the account we're selling from - assume this is the AccountId of the approval Tx
  const firstHopSellAccountId = useAppSelector(selectFirstHopSellAccountId)
  const lastHopSellAccountId = useAppSelector(selectSecondHopSellAccountId)
  const tradeQuoteFirstHop = activeTradeQuote.steps[0]
  const tradeQuoteSecondHop = activeTradeQuote.steps[1]
  const activeTradeId = activeTradeQuote.id
  const stepSource = tradeQuoteFirstHop?.source

  const firstHopStreamingProgress = useStreamingProgress({
    hopIndex: 0,
    tradeQuoteStep: tradeQuoteFirstHop,
  })
  const secondHopStreamingProgress = useStreamingProgress({
    hopIndex: 1,
    // If we don't have a second hop this hook will return undefined anyway. Satisfy the rules of hooks with tradeQuoteFirstHop, which
    // will always be defined.
    tradeQuoteStep: tradeQuoteSecondHop ?? tradeQuoteFirstHop,
  })

  const isFirstHopBridge = useMemo(
    () => tradeQuoteFirstHop?.buyAsset.chainId !== tradeQuoteFirstHop?.sellAsset.chainId,
    [tradeQuoteFirstHop?.buyAsset.chainId, tradeQuoteFirstHop?.sellAsset.chainId],
  )
  const isLastHopBridge = useMemo(
    () => tradeQuoteSecondHop?.buyAsset.chainId !== tradeQuoteSecondHop?.sellAsset.chainId,
    [tradeQuoteSecondHop?.buyAsset.chainId, tradeQuoteSecondHop?.sellAsset.chainId],
  )
  const chainAdapterManager = getChainAdapterManager()
  const activeQuoteErrors = useAppSelector(selectActiveQuoteErrors)
  const activeQuoteError = useMemo(() => activeQuoteErrors?.[0], [activeQuoteErrors])
  const firstHopActionTitleText = useMemo(() => {
    const sellAssetChainId = tradeQuoteFirstHop?.sellAsset.chainId
    const buyAssetChainId = tradeQuoteFirstHop?.buyAsset.chainId
    if (!sellAssetChainId || !buyAssetChainId) return undefined
    const sellChainName = chainAdapterManager.get(sellAssetChainId)?.getDisplayName()
    const buyChainName = chainAdapterManager.get(buyAssetChainId)?.getDisplayName()

    return isFirstHopBridge
      ? translate('trade.transactionTitle.bridge', {
          sellChainName,
          buyChainName,
          swapperName: stepSource,
        })
      : translate('trade.transactionTitle.swap', { sellChainName, swapperName: stepSource })
  }, [
    chainAdapterManager,
    isFirstHopBridge,
    stepSource,
    tradeQuoteFirstHop?.buyAsset.chainId,
    tradeQuoteFirstHop?.sellAsset.chainId,
    translate,
  ])
  const lastHopActionTitleText = useMemo(() => {
    const sellAssetChainId = tradeQuoteSecondHop?.sellAsset.chainId
    const buyAssetChainId = tradeQuoteSecondHop?.buyAsset.chainId
    if (!sellAssetChainId || !buyAssetChainId) return undefined
    const sellChainName = chainAdapterManager.get(sellAssetChainId)?.getDisplayName()
    const buyChainName = chainAdapterManager.get(buyAssetChainId)?.getDisplayName()
    return isLastHopBridge
      ? translate('trade.transactionTitle.bridge', {
          sellChainName,
          buyChainName,
          swapperName: stepSource,
        })
      : translate('trade.transactionTitle.swap', { sellChainName, swapperName: stepSource })
  }, [
    chainAdapterManager,
    isLastHopBridge,
    stepSource,
    tradeQuoteSecondHop?.buyAsset.chainId,
    tradeQuoteSecondHop?.sellAsset.chainId,
    translate,
  ])
  const firstHopExecutionMetadataFilter = useMemo(() => {
    return {
      tradeId: activeTradeId ?? '',
      hopIndex: 0,
    }
  }, [activeTradeId])

  const {
    state: hopExecutionState,
    allowanceApproval: firstHopAllowanceApproval,
    permit2: firstHopPermit2,
    allowanceReset: firstHopAllowanceReset,
    swap: firstHopSwap,
  } = useSelectorWithArgs(selectHopExecutionMetadata, firstHopExecutionMetadataFilter)

  const lastHopExecutionMetadataFilter = useMemo(() => {
    return {
      tradeId: activeTradeId ?? '',
      hopIndex: 1,
    }
  }, [activeTradeId])

  const {
    allowanceApproval: lastHopAllowanceApproval,
    permit2: lastHopPermit2,
    allowanceReset: lastHopAllowanceReset,
    swap: lastHopSwap,
  } = useSelectorWithArgs(selectHopExecutionMetadata, lastHopExecutionMetadataFilter)

  const transactionExecutionStateError = useMemo(() => {
    return [
      firstHopAllowanceApproval.state,
      lastHopAllowanceApproval.state,
      firstHopPermit2.state,
      lastHopPermit2.state,
      firstHopSwap.state,
      lastHopSwap.state,
      firstHopAllowanceReset.state,
      lastHopAllowanceReset.state,
    ].includes(TransactionExecutionState.Failed)
  }, [
    firstHopAllowanceApproval.state,
    firstHopAllowanceReset.state,
    firstHopPermit2.state,
    firstHopSwap.state,
    lastHopAllowanceApproval.state,
    lastHopAllowanceReset.state,
    lastHopPermit2.state,
    lastHopSwap.state,
  ])

  const { tradeSteps, currentTradeStep, currentTradeStepIndex } = useStepperSteps()

  const firstHopAmountCryptoBaseUnit = useMemo(
    () => tradeQuoteFirstHop.buyAmountAfterFeesCryptoBaseUnit,
    [tradeQuoteFirstHop.buyAmountAfterFeesCryptoBaseUnit],
  )
  const prevFirstHopAmountCryptoBaseUnit = usePrevious(firstHopAmountCryptoBaseUnit)

  useEffect(() => {
    if (currentTradeStep !== StepperStep.FirstHopSwap) return

    if (
      !(
        firstHopAmountCryptoBaseUnit &&
        prevFirstHopAmountCryptoBaseUnit &&
        firstHopAmountCryptoBaseUnit !== '0' &&
        prevFirstHopAmountCryptoBaseUnit !== '0'
      )
    )
      return
    if (bn(firstHopAmountCryptoBaseUnit).gte(prevFirstHopAmountCryptoBaseUnit)) return

    rateChanged.open({ prevAmountCryptoBaseUnit: prevFirstHopAmountCryptoBaseUnit })
  }, [
    currentTradeStep,
    firstHopAmountCryptoBaseUnit,
    prevFirstHopAmountCryptoBaseUnit,
    rateChanged,
  ])

  const isError = activeQuoteError || transactionExecutionStateError

  const stepStatus = useMemo(
    () => (
      <StepStatus
        complete={completedStepIndicator}
        incomplete={undefined}
        active={
          activeQuoteError || transactionExecutionStateError ? erroredStepIndicator : undefined
        }
      />
    ),
    [activeQuoteError, transactionExecutionStateError],
  )

  const getStepIndicator = useCallback(
    (step: StepperStep) => {
      switch (step) {
        case StepperStep.FirstHopSwap:
          if (!firstHopProgress || !firstHopSwap.sellTxHash) return stepStatus
          if (firstHopProgress.status === 'complete') return stepStatus
          if (firstHopProgress.status === 'failed') return erroredStepIndicator
          return (
            <CircularProgress
              value={firstHopProgress.progress}
              size='16px'
              isIndeterminate={false}
            />
          )
        case StepperStep.LastHopSwap:
          if (!lastHopProgress || !lastHopSwap.sellTxHash) return stepStatus
          if (lastHopProgress.status === 'complete') return stepStatus
          if (lastHopProgress.status === 'failed') return erroredStepIndicator
          return (
            <CircularProgress
              value={lastHopProgress.progress}
              size='16px'
              isIndeterminate={false}
            />
          )
        default:
          return stepStatus
      }
    },
    [
      firstHopProgress,
      firstHopSwap.sellTxHash,
      lastHopProgress,
      lastHopSwap.sellTxHash,
      stepStatus,
    ],
  )

  const firstHopAllowanceResetTitle = useMemo(() => {
    return (
      <Flex alignItems='center' justifyContent='space-between' flex={1}>
        <Text translation='trade.resetTitle' />
        {firstHopAllowanceReset.txHash && tradeQuoteFirstHop && firstHopSellAccountId && (
          <TxLabel
            txHash={firstHopAllowanceReset.txHash}
            explorerBaseUrl={tradeQuoteFirstHop.sellAsset.explorerTxLink}
            accountId={firstHopSellAccountId}
            stepSource={undefined} // no swapper base URL here, this is an allowance Tx
            quoteSwapperName={activeTradeQuote.swapperName}
          />
        )}
      </Flex>
    )
  }, [
    firstHopAllowanceReset.txHash,
    firstHopSellAccountId,
    tradeQuoteFirstHop,
    activeTradeQuote.swapperName,
  ])

  const firstHopAllowanceApprovalTitle = useMemo(() => {
    const content = (() => {
      // Awaiting Permit2 contract allowance grant
      if (
        firstHopPermit2.isRequired &&
        hopExecutionState === HopExecutionState.AwaitingAllowanceApproval
      )
        return (
          <>
            <Text translation='trade.permit2Allowance.title' />
            <Tooltip label={translate('trade.permit2Allowance.tooltip')}>
              <Box ml={1}>
                <Icon as={FaInfoCircle} color='text.subtle' fontSize='0.8em' />
              </Box>
            </Tooltip>
          </>
        )

      // Good ol' allowances
      return (
        <>
          <Text translation='trade.approvalTitle' />
          {firstHopAllowanceApproval.txHash && tradeQuoteFirstHop && firstHopSellAccountId && (
            <TxLabel
              txHash={firstHopAllowanceApproval.txHash}
              explorerBaseUrl={tradeQuoteFirstHop.sellAsset.explorerTxLink}
              accountId={firstHopSellAccountId}
              stepSource={undefined} // no swapper base URL here, this is an allowance Tx
              quoteSwapperName={activeTradeQuote.swapperName}
            />
          )}
        </>
      )
    })()
    return (
      <Flex alignItems='center' justifyContent='space-between' flex={1}>
        {content}
      </Flex>
    )
  }, [
    firstHopAllowanceApproval.txHash,
    firstHopPermit2.isRequired,
    firstHopSellAccountId,
    hopExecutionState,
    tradeQuoteFirstHop,
    activeTradeQuote.swapperName,
    translate,
  ])

  const firstHopPermit2SignTitle = useMemo(() => {
    return (
      <Flex alignItems='center' justifyContent='space-between' flex={1}>
        <Text translation='trade.permit2Eip712.title' />
        <Tooltip label={translate('trade.permit2Eip712.tooltip', { swapperName: stepSource })}>
          <Box ml={1}>
            <Icon as={FaInfoCircle} color='text.subtle' fontSize='0.8em' />
          </Box>
        </Tooltip>
      </Flex>
    )
  }, [stepSource, translate])

  const firstHopActionTitle = useMemo(() => {
    return (
      <VStack width='full' spacing={2} align='stretch'>
        <Flex alignItems='center' justifyContent='space-between' flex={1} gap={2}>
          <HStack>
            <RawText>{firstHopActionTitleText}</RawText>
            {firstHopStreamingProgress && firstHopStreamingProgress.totalSwapCount > 0 && (
              <Tag
                minWidth='auto'
                colorScheme={firstHopStreamingProgress.isComplete ? 'green' : 'blue'}
              >
                {`${firstHopStreamingProgress.attemptedSwapCount}/${firstHopStreamingProgress.totalSwapCount}`}
              </Tag>
            )}
          </HStack>
          {tradeQuoteFirstHop && firstHopSellAccountId && (
            <VStack>
              {firstHopSwap.sellTxHash && (
                <TxLabel
                  txHash={firstHopSwap.sellTxHash}
                  explorerBaseUrl={tradeQuoteFirstHop.sellAsset.explorerTxLink}
                  accountId={firstHopSellAccountId}
                  stepSource={stepSource}
                  quoteSwapperName={activeTradeQuote.swapperName}
                />
              )}
              {firstHopSwap.buyTxHash && firstHopSwap.buyTxHash !== firstHopSwap.sellTxHash && (
                <TxLabel
                  isBuyTxHash
                  txHash={firstHopSwap.buyTxHash}
                  explorerBaseUrl={tradeQuoteFirstHop.buyAsset.explorerTxLink}
                  accountId={firstHopSellAccountId}
                  stepSource={stepSource}
                  quoteSwapperName={activeTradeQuote.swapperName}
                />
              )}
            </VStack>
          )}
        </Flex>
      </VStack>
    )
  }, [
    firstHopActionTitleText,
    firstHopSellAccountId,
    firstHopStreamingProgress,
    firstHopSwap.buyTxHash,
    firstHopSwap.sellTxHash,
    stepSource,
    activeTradeQuote.swapperName,
    tradeQuoteFirstHop,
  ])

  const lastHopAllowanceResetTitle = useMemo(() => {
    return (
      <Flex alignItems='center' justifyContent='space-between' flex={1}>
        <Text translation='trade.resetTitle' />
        {lastHopAllowanceReset.txHash && tradeQuoteSecondHop && lastHopSellAccountId && (
          <TxLabel
            txHash={lastHopAllowanceReset.txHash}
            explorerBaseUrl={tradeQuoteSecondHop.sellAsset.explorerTxLink}
            accountId={lastHopSellAccountId}
            stepSource={undefined} // no swapper base URL here, this is an allowance Tx
            quoteSwapperName={activeTradeQuote.swapperName}
          />
        )}
      </Flex>
    )
  }, [
    lastHopAllowanceReset.txHash,
    lastHopSellAccountId,
    tradeQuoteSecondHop,
    activeTradeQuote.swapperName,
  ])

  const lastHopAllowanceApprovalTitle = useMemo(() => {
    return (
      <Flex alignItems='center' justifyContent='space-between' flex={1}>
        {lastHopPermit2.isRequired === true ? (
          <>
            <Text translation='trade.permit2Allowance.title' />
            <Tooltip label={translate('trade.permit2Allowance.tooltip')}>
              <Box ml={1}>
                <Icon as={FaInfoCircle} color='text.subtle' fontSize='0.8em' />
              </Box>
            </Tooltip>
          </>
        ) : (
          <>
            <Text translation='trade.approvalTitle' />
            {lastHopAllowanceApproval.txHash && tradeQuoteSecondHop && lastHopSellAccountId && (
              <TxLabel
                txHash={lastHopAllowanceApproval.txHash}
                explorerBaseUrl={tradeQuoteSecondHop.sellAsset.explorerTxLink}
                accountId={lastHopSellAccountId}
                stepSource={undefined} // no swapper base URL here, this is an allowance Tx
                quoteSwapperName={activeTradeQuote.swapperName}
              />
            )}
          </>
        )}
      </Flex>
    )
  }, [
    lastHopAllowanceApproval.txHash,
    lastHopPermit2.isRequired,
    lastHopSellAccountId,
    tradeQuoteSecondHop,
    activeTradeQuote.swapperName,
    translate,
  ])

  const lastHopActionTitle = useMemo(() => {
    return (
      <VStack width='full' spacing={2} align='stretch'>
        <Flex alignItems='center' justifyContent='space-between' flex={1} gap={2}>
          <HStack>
            <RawText>{lastHopActionTitleText}</RawText>
            {secondHopStreamingProgress && secondHopStreamingProgress.totalSwapCount > 0 && (
              <Tag
                minWidth='auto'
                colorScheme={secondHopStreamingProgress.isComplete ? 'green' : 'blue'}
              >
                {`${secondHopStreamingProgress.attemptedSwapCount}/${secondHopStreamingProgress.totalSwapCount}`}
              </Tag>
            )}
          </HStack>
          {tradeQuoteSecondHop && lastHopSellAccountId && (
            <VStack>
              {lastHopSwap.sellTxHash && (
                <TxLabel
                  txHash={lastHopSwap.sellTxHash}
                  explorerBaseUrl={tradeQuoteSecondHop.sellAsset.explorerTxLink}
                  accountId={lastHopSellAccountId}
                  stepSource={stepSource}
                  quoteSwapperName={activeTradeQuote.swapperName}
                />
              )}
              {lastHopSwap.buyTxHash && lastHopSwap.buyTxHash !== lastHopSwap.sellTxHash && (
                <TxLabel
                  txHash={lastHopSwap.buyTxHash}
                  explorerBaseUrl={tradeQuoteSecondHop.buyAsset.explorerTxLink}
                  accountId={lastHopSellAccountId}
                  stepSource={stepSource}
                  quoteSwapperName={activeTradeQuote.swapperName}
                />
              )}
            </VStack>
          )}
        </Flex>
      </VStack>
    )
  }, [
    lastHopActionTitleText,
    lastHopSellAccountId,
    lastHopSwap.buyTxHash,
    lastHopSwap.sellTxHash,
    secondHopStreamingProgress,
    stepSource,
    activeTradeQuote.swapperName,
    tradeQuoteSecondHop,
  ])

  return (
    <Stepper variant='innerSteps' orientation='vertical' index={currentTradeStepIndex} gap={0}>
      {tradeSteps[StepperStep.FirstHopReset] ? (
        <StepperStepComponent
          title={firstHopAllowanceResetTitle}
          stepIndicator={getStepIndicator(StepperStep.FirstHopReset)}
          stepProps={stepProps}
          useSpacer={false}
          isError={isError && currentTradeStep === StepperStep.FirstHopReset}
          stepIndicatorVariant='innerSteps'
        />
      ) : null}
      {tradeSteps[StepperStep.FirstHopApproval] ? (
        <StepperStepComponent
          title={firstHopAllowanceApprovalTitle}
          stepIndicator={getStepIndicator(StepperStep.FirstHopApproval)}
          stepProps={stepProps}
          useSpacer={false}
          isError={isError && currentTradeStep === StepperStep.FirstHopApproval}
          stepIndicatorVariant='innerSteps'
        />
      ) : null}
      {tradeSteps[StepperStep.FirstHopPermit2Eip712Sign] ? (
        <StepperStepComponent
          title={firstHopPermit2SignTitle}
          stepIndicator={getStepIndicator(StepperStep.FirstHopPermit2Eip712Sign)}
          stepProps={stepProps}
          useSpacer={false}
          isError={isError && currentTradeStep === StepperStep.FirstHopApproval}
          stepIndicatorVariant='innerSteps'
        />
      ) : null}
      <StepperStepComponent
        title={firstHopActionTitle}
        stepIndicator={getStepIndicator(StepperStep.FirstHopSwap)}
        stepProps={stepProps}
        useSpacer={false}
        isError={isError && currentTradeStep === StepperStep.FirstHopSwap}
        stepIndicatorVariant='innerSteps'
      />
      {tradeSteps[StepperStep.LastHopReset] ? (
        <StepperStepComponent
          title={lastHopAllowanceResetTitle}
          stepIndicator={getStepIndicator(StepperStep.LastHopReset)}
          stepProps={stepProps}
          useSpacer={false}
          isError={isError && currentTradeStep === StepperStep.LastHopReset}
          stepIndicatorVariant='innerSteps'
        />
      ) : null}
      {tradeSteps[StepperStep.LastHopApproval] ? (
        <StepperStepComponent
          title={lastHopAllowanceApprovalTitle}
          stepIndicator={getStepIndicator(StepperStep.LastHopApproval)}
          stepProps={stepProps}
          useSpacer={false}
          isError={isError && currentTradeStep === StepperStep.LastHopApproval}
          stepIndicatorVariant='innerSteps'
        />
      ) : null}
      {tradeSteps[StepperStep.LastHopSwap] ? (
        <StepperStepComponent
          title={lastHopActionTitle}
          stepIndicator={getStepIndicator(StepperStep.LastHopSwap)}
          stepProps={stepProps}
          useSpacer={false}
          isError={isError && currentTradeStep === StepperStep.LastHopSwap}
          stepIndicatorVariant='innerSteps'
        />
      ) : null}
    </Stepper>
  )
}
