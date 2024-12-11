import { CheckCircleIcon } from '@chakra-ui/icons'
import { CircularProgress, Flex, Stepper, StepStatus, VStack } from '@chakra-ui/react'
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
  selectActiveQuote,
  selectActiveSwapperName,
  selectFirstHop,
  selectHopExecutionMetadata,
  selectLastHop,
} from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector, useSelectorWithArgs } from 'state/store'

import { StepperStep } from '../MultiHopTradeConfirm/components/StepperStep'
import { useTradeSteps } from './hooks/useTradeSteps'
import { TxLabel } from './TxLabel'

const pendingStepIndicator = <CircularProgress size={5} trackColor='blue.500' />
const completedStepIndicator = <CheckCircleIcon color='text.success' />

export const ExpandedTradeSteps = () => {
  const translate = useTranslate()
  const stepProps = useMemo(() => ({ alignItems: 'center', py: 2 }), [])
  const activeTradeId = useAppSelector(selectActiveQuote)?.id
  const swapperName = useAppSelector(selectActiveSwapperName)
  const tradeQuoteFirstHop = useAppSelector(selectFirstHop)
  const tradeQuoteLastHop = useAppSelector(selectLastHop)
  // this is the account we're selling from - assume this is the AccountId of the approval Tx
  const firstHopSellAccountId = useAppSelector(selectFirstHopSellAccountId)
  const lastHopSellAccountId = useAppSelector(selectSecondHopSellAccountId)
  const isMultiHopTrade = useAppSelector(selectIsActiveQuoteMultiHop)
  const isFirstHopBridge = useMemo(
    () => tradeQuoteFirstHop?.buyAsset.chainId !== tradeQuoteFirstHop?.sellAsset.chainId,
    [tradeQuoteFirstHop?.buyAsset.chainId, tradeQuoteFirstHop?.sellAsset.chainId],
  )
  const isLastHopBridge = useMemo(
    () => tradeQuoteLastHop?.buyAsset.chainId !== tradeQuoteLastHop?.sellAsset.chainId,
    [tradeQuoteLastHop?.buyAsset.chainId, tradeQuoteLastHop?.sellAsset.chainId],
  )
  const chainAdapterManager = getChainAdapterManager()
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
    // state: firstHopExecutionState,
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
    // state: lastHopExecutionState,
    allowanceApproval: lastHopAllowanceApproval,
    permit2: lastHopPermit2,
    allowanceReset: lastHopAllowanceReset,
    swap: lastHopSwap,
  } = useSelectorWithArgs(selectHopExecutionMetadata, lastHopExecutionMetadataFilter)

  const { currentStep } = useTradeSteps()

  const stepIndicator = useMemo(
    () => (
      <StepStatus
        complete={completedStepIndicator}
        incomplete={pendingStepIndicator}
        active={pendingStepIndicator}
      />
    ),
    [],
  )

  const firstHopAllowanceResetTitle = useMemo(() => {
    return (
      <Flex alignItems='center' justifyContent='space-between' flex={1}>
        <Text translation='trade.awaitingAllowanceReset' />
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
          <Text translation='trade.awaitingPermit2Approval' />
        ) : (
          <>
            <Text translation='trade.awaitingApproval' />
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
        <RawText>{firstHopActionTitleText}</RawText>
        {tradeQuoteFirstHop && firstHopSellAccountId && (
          <VStack>
            {firstHopSwap.buyTxHash && (
              <TxLabel
                txHash={firstHopSwap.buyTxHash}
                explorerTxLink={tradeQuoteFirstHop.buyAsset.explorerTxLink}
                accountId={firstHopSellAccountId}
              />
            )}
            {firstHopSwap.sellTxHash && (
              <TxLabel
                txHash={firstHopSwap.sellTxHash}
                explorerTxLink={tradeQuoteFirstHop.sellAsset.explorerTxLink}
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
    firstHopSwap.buyTxHash,
    firstHopSwap.sellTxHash,
    tradeQuoteFirstHop,
  ])

  const lastHopAllowanceResetTitle = useMemo(() => {
    return (
      <Flex alignItems='center' justifyContent='space-between' flex={1}>
        <Text translation='trade.awaitingAllowanceReset' />
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
          <Text translation='trade.awaitingPermit2Approval' />
        ) : (
          <>
            <Text translation='trade.awaitingApproval' />
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
        <RawText>{lastHopActionTitleText}</RawText>
        {tradeQuoteLastHop && lastHopSellAccountId && (
          <VStack>
            {lastHopSwap.buyTxHash && (
              <TxLabel
                txHash={lastHopSwap.buyTxHash}
                explorerTxLink={tradeQuoteLastHop.buyAsset.explorerTxLink}
                accountId={lastHopSellAccountId}
              />
            )}
            {lastHopSwap.sellTxHash && (
              <TxLabel
                txHash={lastHopSwap.sellTxHash}
                explorerTxLink={tradeQuoteLastHop.sellAsset.explorerTxLink}
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
    tradeQuoteLastHop,
  ])

  return (
    <Stepper orientation='vertical' index={currentStep} gap='0'>
      {firstHopAllowanceReset.isRequired === true ? (
        <StepperStep
          title={firstHopAllowanceResetTitle}
          stepIndicator={stepIndicator}
          stepProps={stepProps}
          useSpacer={false}
        />
      ) : null}
      {firstHopAllowanceApproval.isInitiallyRequired === true ||
      firstHopPermit2.isRequired === true ? (
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
          {lastHopAllowanceReset.isRequired === true ? (
            <StepperStep
              title={lastHopAllowanceResetTitle}
              stepIndicator={stepIndicator}
              stepProps={stepProps}
              useSpacer={false}
            />
          ) : null}
          {lastHopAllowanceApproval.isInitiallyRequired === true ||
          lastHopPermit2.isRequired === true ? (
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
