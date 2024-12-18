import { CheckCircleIcon, WarningIcon } from '@chakra-ui/icons'
import { CircularProgress, Flex, HStack, Stepper, StepStatus, Tag, VStack } from '@chakra-ui/react'
import type { TradeQuote, TradeRate } from '@shapeshiftoss/swapper'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { RawText, Text } from 'components/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import {
  selectFirstHopSellAccountId,
  selectIsActiveQuoteMultiHop,
  selectSecondHopSellAccountId,
} from 'state/slices/tradeInputSlice/selectors'
import {
  selectActiveQuoteErrors,
  selectActiveSwapperName,
  selectHopExecutionMetadata,
} from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector, useSelectorWithArgs } from 'state/store'

import { StepperStep } from '../MultiHopTradeConfirm/components/StepperStep'
import { TradeStep } from './helpers'
import { useStreamingProgress } from './hooks/useStreamingProgress'
import { useTradeSteps } from './hooks/useTradeSteps'
import { TxLabel } from './TxLabel'

const pendingStepIndicator = <CircularProgress size={5} trackColor='blue.500' />
const erroredStepIndicator = <WarningIcon color='red.500' />
const completedStepIndicator = <CheckCircleIcon color='text.success' />

type ExpandedTradeStepsProps = {
  activeTradeQuote: TradeQuote | TradeRate
}

export const ExpandedTradeSteps = ({ activeTradeQuote }: ExpandedTradeStepsProps) => {
  const translate = useTranslate()
  const stepProps = useMemo(() => ({ alignItems: 'center', py: 2, pr: 2 }), [])
  const swapperName = useAppSelector(selectActiveSwapperName)
  // this is the account we're selling from - assume this is the AccountId of the approval Tx
  const firstHopSellAccountId = useAppSelector(selectFirstHopSellAccountId)
  const lastHopSellAccountId = useAppSelector(selectSecondHopSellAccountId)
  const isMultiHopTrade = useAppSelector(selectIsActiveQuoteMultiHop)
  const tradeQuoteFirstHop = activeTradeQuote.steps[0]
  const tradeQuoteLastHop = activeTradeQuote.steps[1]
  const activeTradeId = activeTradeQuote.id

  const firstHopStreamingProgress = useStreamingProgress({
    hopIndex: 0,
    tradeQuoteStep: tradeQuoteFirstHop,
  })
  const secondHopStreamingProgress = useStreamingProgress({
    hopIndex: 1,
    // If we don't have a second hop this hook will return undefined anyway. Satisfy the rules of hooks with tradeQuoteFirstHop, which
    // will always be defined.
    tradeQuoteStep: tradeQuoteLastHop ?? tradeQuoteFirstHop,
  })

  const isFirstHopBridge = useMemo(
    () => tradeQuoteFirstHop?.buyAsset.chainId !== tradeQuoteFirstHop?.sellAsset.chainId,
    [tradeQuoteFirstHop?.buyAsset.chainId, tradeQuoteFirstHop?.sellAsset.chainId],
  )
  const isLastHopBridge = useMemo(
    () => tradeQuoteLastHop?.buyAsset.chainId !== tradeQuoteLastHop?.sellAsset.chainId,
    [tradeQuoteLastHop?.buyAsset.chainId, tradeQuoteLastHop?.sellAsset.chainId],
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
      ? translate('trade.transactionTitle.bridge', { sellChainName, buyChainName, swapperName })
      : translate('trade.transactionTitle.swap', { sellChainName, swapperName })
  }, [
    chainAdapterManager,
    isFirstHopBridge,
    swapperName,
    tradeQuoteFirstHop?.buyAsset.chainId,
    tradeQuoteFirstHop?.sellAsset.chainId,
    translate,
  ])
  const lastHopActionTitleText = useMemo(() => {
    const sellAssetChainId = tradeQuoteLastHop?.sellAsset.chainId
    const buyAssetChainId = tradeQuoteLastHop?.buyAsset.chainId
    if (!sellAssetChainId || !buyAssetChainId) return undefined
    const sellChainName = chainAdapterManager.get(sellAssetChainId)?.getDisplayName()
    const buyChainName = chainAdapterManager.get(buyAssetChainId)?.getDisplayName()
    return isLastHopBridge
      ? translate('trade.transactionTitle.bridge', { sellChainName, buyChainName, swapperName })
      : translate('trade.transactionTitle.swap', { sellChainName, swapperName })
  }, [
    chainAdapterManager,
    isLastHopBridge,
    swapperName,
    tradeQuoteLastHop?.buyAsset.chainId,
    tradeQuoteLastHop?.sellAsset.chainId,
    translate,
  ])
  const firstHopExecutionMetadataFilter = useMemo(() => {
    return {
      tradeId: activeTradeId ?? '',
      hopIndex: 0,
    }
  }, [activeTradeId])

  const {
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

  const { currentTradeStepIndex: currentStep } = useTradeSteps()

  const stepIndicator = useMemo(
    () => (
      <StepStatus
        complete={completedStepIndicator}
        incomplete={pendingStepIndicator}
        active={activeQuoteError ? erroredStepIndicator : pendingStepIndicator}
      />
    ),
    [activeQuoteError],
  )

  const firstHopAllowanceResetTitle = useMemo(() => {
    return (
      <Flex alignItems='center' justifyContent='space-between' flex={1}>
        <Text translation='trade.resetTitle' />
        {firstHopAllowanceReset.txHash && tradeQuoteFirstHop && firstHopSellAccountId && (
          <TxLabel
            txHash={firstHopAllowanceReset.txHash}
            explorerTxLink={tradeQuoteFirstHop.sellAsset.explorerTxLink}
            accountId={firstHopSellAccountId}
          />
        )}
      </Flex>
    )
  }, [firstHopAllowanceReset.txHash, firstHopSellAccountId, tradeQuoteFirstHop])

  const firstHopAllowanceApprovalTitle = useMemo(() => {
    return (
      <Flex alignItems='center' justifyContent='space-between' flex={1}>
        {firstHopPermit2.isRequired === true ? (
          // TODO: Add permit2 tooltip
          <Text translation='trade.permit2.title' />
        ) : (
          <>
            <Text translation='trade.approvalTitle' />
            {firstHopAllowanceApproval.txHash && tradeQuoteFirstHop && firstHopSellAccountId && (
              <TxLabel
                txHash={firstHopAllowanceApproval.txHash}
                explorerTxLink={tradeQuoteFirstHop.sellAsset.explorerTxLink}
                accountId={firstHopSellAccountId}
              />
            )}
          </>
        )}
      </Flex>
    )
  }, [
    firstHopAllowanceApproval.txHash,
    firstHopPermit2.isRequired,
    firstHopSellAccountId,
    tradeQuoteFirstHop,
  ])

  const firstHopActionTitle = useMemo(() => {
    return (
      <Flex alignItems='center' justifyContent='space-between' flex={1}>
        <HStack>
          <RawText>{firstHopActionTitleText}</RawText>
          {firstHopStreamingProgress && firstHopStreamingProgress.totalSwapCount > 0 && (
            <Tag colorScheme={firstHopStreamingProgress.isComplete ? 'green' : 'blue'}>
              {`${firstHopStreamingProgress.attemptedSwapCount}/${firstHopStreamingProgress.totalSwapCount}`}
            </Tag>
          )}
        </HStack>
        {tradeQuoteFirstHop && firstHopSellAccountId && (
          <VStack>
            {firstHopSwap.sellTxHash && (
              <TxLabel
                txHash={firstHopSwap.sellTxHash}
                explorerTxLink={tradeQuoteFirstHop.sellAsset.explorerTxLink}
                accountId={firstHopSellAccountId}
              />
            )}
            {firstHopSwap.buyTxHash && firstHopSwap.buyTxHash !== firstHopSwap.sellTxHash && (
              <TxLabel
                txHash={firstHopSwap.buyTxHash}
                explorerTxLink={tradeQuoteFirstHop.buyAsset.explorerTxLink}
                accountId={firstHopSellAccountId}
              />
            )}
          </VStack>
        )}
      </Flex>
    )
  }, [
    firstHopActionTitleText,
    firstHopSellAccountId,
    firstHopStreamingProgress,
    firstHopSwap.buyTxHash,
    firstHopSwap.sellTxHash,
    tradeQuoteFirstHop,
  ])

  const lastHopAllowanceResetTitle = useMemo(() => {
    return (
      <Flex alignItems='center' justifyContent='space-between' flex={1}>
        <Text translation='trade.resetTitle' />
        {lastHopAllowanceReset.txHash && tradeQuoteLastHop && lastHopSellAccountId && (
          <TxLabel
            txHash={lastHopAllowanceReset.txHash}
            explorerTxLink={tradeQuoteLastHop.sellAsset.explorerTxLink}
            accountId={lastHopSellAccountId}
          />
        )}
      </Flex>
    )
  }, [lastHopAllowanceReset.txHash, lastHopSellAccountId, tradeQuoteLastHop])

  const lastHopAllowanceApprovalTitle = useMemo(() => {
    return (
      <Flex alignItems='center' justifyContent='space-between' flex={1}>
        {lastHopPermit2.isRequired === true ? (
          // TODO: Add permit2 tooltip
          <Text translation='trade.permit2.title' />
        ) : (
          <>
            <Text translation='trade.approvalTitle' />
            {lastHopAllowanceApproval.txHash && tradeQuoteLastHop && lastHopSellAccountId && (
              <TxLabel
                txHash={lastHopAllowanceApproval.txHash}
                explorerTxLink={tradeQuoteLastHop.sellAsset.explorerTxLink}
                accountId={lastHopSellAccountId}
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
    tradeQuoteLastHop,
  ])

  const lastHopActionTitle = useMemo(() => {
    return (
      <Flex alignItems='center' justifyContent='space-between' flex={1}>
        <HStack>
          <RawText>{lastHopActionTitleText}</RawText>
          {secondHopStreamingProgress && secondHopStreamingProgress.totalSwapCount > 0 && (
            <Tag colorScheme={secondHopStreamingProgress.isComplete ? 'green' : 'blue'}>
              {`${secondHopStreamingProgress.attemptedSwapCount}/${secondHopStreamingProgress.totalSwapCount}`}
            </Tag>
          )}
        </HStack>
        {tradeQuoteLastHop && lastHopSellAccountId && (
          <VStack>
            {lastHopSwap.sellTxHash && (
              <TxLabel
                txHash={lastHopSwap.sellTxHash}
                explorerTxLink={tradeQuoteLastHop.sellAsset.explorerTxLink}
                accountId={lastHopSellAccountId}
              />
            )}
            {lastHopSwap.buyTxHash && lastHopSwap.buyTxHash !== lastHopSwap.sellTxHash && (
              <TxLabel
                txHash={lastHopSwap.buyTxHash}
                explorerTxLink={tradeQuoteLastHop.buyAsset.explorerTxLink}
                accountId={lastHopSellAccountId}
              />
            )}
          </VStack>
        )}
      </Flex>
    )
  }, [
    lastHopActionTitleText,
    lastHopSellAccountId,
    lastHopSwap.buyTxHash,
    lastHopSwap.sellTxHash,
    secondHopStreamingProgress,
    tradeQuoteLastHop,
  ])

  const { tradeSteps } = useTradeSteps()

  return (
    <Stepper orientation='vertical' index={currentStep} gap='0'>
      {tradeSteps[TradeStep.FirstHopReset] ? (
        <StepperStep
          title={firstHopAllowanceResetTitle}
          stepIndicator={stepIndicator}
          stepProps={stepProps}
          useSpacer={false}
        />
      ) : null}
      {tradeSteps[TradeStep.FirstHopApproval] ? (
        <StepperStep
          title={firstHopAllowanceApprovalTitle}
          stepIndicator={stepIndicator}
          stepProps={stepProps}
          useSpacer={false}
        />
      ) : null}
      <StepperStep
        title={firstHopActionTitle}
        stepIndicator={stepIndicator}
        stepProps={stepProps}
        useSpacer={false}
      />
      {isMultiHopTrade && (
        <>
          {tradeSteps[TradeStep.LastHopReset] ? (
            <StepperStep
              title={lastHopAllowanceResetTitle}
              stepIndicator={stepIndicator}
              stepProps={stepProps}
              useSpacer={false}
            />
          ) : null}
          {tradeSteps[TradeStep.LastHopApproval] ? (
            <StepperStep
              title={lastHopAllowanceApprovalTitle}
              stepIndicator={stepIndicator}
              stepProps={stepProps}
              useSpacer={false}
            />
          ) : null}
          <StepperStep
            title={lastHopActionTitle}
            stepIndicator={stepIndicator}
            stepProps={stepProps}
            useSpacer={false}
          />
        </>
      )}
    </Stepper>
  )
}
