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
  VStack,
} from '@chakra-ui/react'
import type { TradeQuote, TradeRate } from '@shapeshiftoss/swapper'
import { useMemo } from 'react'
import { FaInfoCircle } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { RawText, Text } from 'components/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import {
  selectFirstHopSellAccountId,
  selectSecondHopSellAccountId,
} from 'state/slices/tradeInputSlice/selectors'
import {
  selectActiveQuoteErrors,
  selectHopExecutionMetadata,
} from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector, useSelectorWithArgs } from 'state/store'

import { StepperStep as StepperStepComponent } from '../MultiHopTradeConfirm/components/StepperStep'
import { StepperStep } from './helpers'
import { useStepperSteps } from './hooks/useStepperSteps'
import { useStreamingProgress } from './hooks/useStreamingProgress'
import { TxLabel } from './TxLabel'

const erroredStepIndicator = <WarningIcon color='red.500' />
const completedStepIndicator = <CheckCircleIcon color='text.success' />

const stepProps = { alignItems: 'center', py: 2, pr: 2, pl: 1.5 }

type ExpandedStepperStepsProps = {
  activeTradeQuote: TradeQuote | TradeRate
}

export const ExpandedStepperSteps = ({ activeTradeQuote }: ExpandedStepperStepsProps) => {
  const translate = useTranslate()
  // this is the account we're selling from - assume this is the AccountId of the approval Tx
  const firstHopSellAccountId = useAppSelector(selectFirstHopSellAccountId)
  const lastHopSellAccountId = useAppSelector(selectSecondHopSellAccountId)
  const tradeQuoteFirstHop = activeTradeQuote.steps[0]
  const tradeQuoteLastHop = activeTradeQuote.steps[1]
  const activeTradeId = activeTradeQuote.id
  const swapperName = tradeQuoteFirstHop?.source

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

  const { currentTradeStepIndex: currentStep } = useStepperSteps()

  const stepIndicator = useMemo(
    () => (
      <StepStatus
        complete={completedStepIndicator}
        incomplete={undefined}
        active={activeQuoteError ? erroredStepIndicator : undefined}
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
          <>
            <Text translation='trade.permit2Title' />
            <Tooltip label={translate('trade.permit2.tooltip')}>
              <Box ml={1}>
                <Icon as={FaInfoCircle} color='text.subtle' fontSize='0.8em' />
              </Box>
            </Tooltip>
          </>
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
    translate,
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
          <>
            <Text translation='trade.permit2Title' />
            <Tooltip label={translate('trade.permit2.tooltip')}>
              <Box ml={1}>
                <Icon as={FaInfoCircle} color='text.subtle' fontSize='0.8em' />
              </Box>
            </Tooltip>
          </>
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
    translate,
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

  const { tradeSteps, currentTradeStep } = useStepperSteps()

  return (
    <Stepper variant='innerSteps' orientation='vertical' index={currentStep} gap={0}>
      {tradeSteps[StepperStep.FirstHopReset] ? (
        <StepperStepComponent
          title={firstHopAllowanceResetTitle}
          stepIndicator={stepIndicator}
          stepProps={stepProps}
          useSpacer={false}
          isError={activeQuoteError && currentTradeStep === StepperStep.FirstHopReset}
          stepIndicatorVariant='innerSteps'
        />
      ) : null}
      {tradeSteps[StepperStep.FirstHopApproval] ? (
        <StepperStepComponent
          title={firstHopAllowanceApprovalTitle}
          stepIndicator={stepIndicator}
          stepProps={stepProps}
          useSpacer={false}
          isError={activeQuoteError && currentTradeStep === StepperStep.FirstHopApproval}
          stepIndicatorVariant='innerSteps'
        />
      ) : null}
      <StepperStepComponent
        title={firstHopActionTitle}
        stepIndicator={stepIndicator}
        stepProps={stepProps}
        useSpacer={false}
        isError={activeQuoteError && currentTradeStep === StepperStep.FirstHopSwap}
        stepIndicatorVariant='innerSteps'
      />
      {tradeSteps[StepperStep.LastHopReset] ? (
        <StepperStepComponent
          title={lastHopAllowanceResetTitle}
          stepIndicator={stepIndicator}
          stepProps={stepProps}
          useSpacer={false}
          isError={activeQuoteError && currentTradeStep === StepperStep.LastHopReset}
          stepIndicatorVariant='innerSteps'
        />
      ) : null}
      {tradeSteps[StepperStep.LastHopApproval] ? (
        <StepperStepComponent
          title={lastHopAllowanceApprovalTitle}
          stepIndicator={stepIndicator}
          stepProps={stepProps}
          useSpacer={false}
          isError={activeQuoteError && currentTradeStep === StepperStep.LastHopApproval}
          stepIndicatorVariant='innerSteps'
        />
      ) : null}
      {tradeSteps[StepperStep.LastHopSwap] ? (
        <StepperStepComponent
          title={lastHopActionTitle}
          stepIndicator={stepIndicator}
          stepProps={stepProps}
          useSpacer={false}
          isError={activeQuoteError && currentTradeStep === StepperStep.LastHopSwap}
          stepIndicatorVariant='innerSteps'
        />
      ) : null}
    </Stepper>
  )
}
