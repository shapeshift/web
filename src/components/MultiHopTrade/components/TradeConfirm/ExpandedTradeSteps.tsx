import { CheckCircleIcon } from '@chakra-ui/icons'
import { CircularProgress, Stepper, StepStatus } from '@chakra-ui/react'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { selectIsActiveQuoteMultiHop } from 'state/slices/tradeInputSlice/selectors'
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

const pendingStepIndicator = <CircularProgress size={5} trackColor='blue.500' />
const completedStepIndicator = <CheckCircleIcon color='text.success' />

export const ExpandedTradeSteps = () => {
  const translate = useTranslate()
  const stepProps = useMemo(() => ({ alignItems: 'center', py: 2 }), [])
  const activeTradeId = useAppSelector(selectActiveQuote)?.id
  const swapperName = useAppSelector(selectActiveSwapperName)
  const tradeQuoteFirstHop = useAppSelector(selectFirstHop)
  const tradeQuoteLastHop = useAppSelector(selectLastHop)
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
  const firstHopActionTitle = useMemo(() => {
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
  const lastHopActionTitle = useMemo(() => {
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
    // swap,
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
    // swap,
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

  return (
    <Stepper orientation='vertical' index={currentStep} gap='0'>
      {firstHopAllowanceReset.isRequired === true ? (
        <StepperStep
          title={translate('trade.awaitingAllowanceReset')}
          stepIndicator={stepIndicator}
          stepProps={stepProps}
          useSpacer={false}
        />
      ) : null}
      {firstHopAllowanceApproval.isInitiallyRequired === true ||
      firstHopPermit2.isRequired === true ? (
        <StepperStep
          title={
            firstHopPermit2.isRequired
              ? translate('trade.awaitingPermit2Approval')
              : translate('trade.awaitingApproval')
          }
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
              title={translate('trade.awaitingAllowanceReset')}
              stepIndicator={stepIndicator}
              stepProps={stepProps}
              useSpacer={false}
            />
          ) : null}
          {lastHopAllowanceApproval.isInitiallyRequired === true ||
          lastHopPermit2.isRequired === true ? (
            <StepperStep
              title={
                lastHopPermit2.isRequired
                  ? translate('trade.awaitingPermit2Approval')
                  : translate('trade.awaitingApproval')
              }
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
