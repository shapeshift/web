import { ArrowDownIcon, ArrowUpDownIcon } from '@chakra-ui/icons'
import {
  Box,
  Card,
  Collapse,
  Flex,
  HStack,
  Progress,
  Spinner,
  Step,
  Stepper,
  StepSeparator,
} from '@chakra-ui/react'
import prettyMilliseconds from 'pretty-ms'
import { useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { Text } from 'components/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import {
  selectActiveQuote,
  selectActiveSwapperName,
  selectConfirmedTradeExecutionState,
  selectFirstHop,
  selectHopExecutionMetadata,
  selectIsActiveQuoteMultiHop,
  selectLastHop,
} from 'state/slices/tradeQuoteSlice/selectors'
import { TradeExecutionState } from 'state/slices/tradeQuoteSlice/types'
import { useAppSelector } from 'state/store'

import { AssetSummaryStep } from '../MultiHopTradeConfirm/components/AssetSummaryStep'
import { StepperStep } from '../MultiHopTradeConfirm/components/StepperStep'
import { getHopExecutionStateSummaryStepTranslation } from './helpers'
import { useCurrentHopIndex } from './hooks/useCurrentHopIndex'

const stepIndicator = <Spinner />

const EtaStep = () => {
  const tradeQuoteFirstHop = useAppSelector(selectFirstHop)
  const tradeQuoteLastHop = useAppSelector(selectLastHop)
  const isMultiHopTrade = useAppSelector(selectIsActiveQuoteMultiHop)
  const etaStepProps = useMemo(() => ({ alignItems: 'center', py: 2 }), [])
  const totalEstimatedExecutionTimeMs = useMemo(() => {
    if (!tradeQuoteFirstHop || !tradeQuoteLastHop) return undefined
    if (!tradeQuoteFirstHop.estimatedExecutionTimeMs || !tradeQuoteLastHop.estimatedExecutionTimeMs)
      return undefined
    return isMultiHopTrade
      ? tradeQuoteFirstHop.estimatedExecutionTimeMs + tradeQuoteLastHop.estimatedExecutionTimeMs
      : tradeQuoteFirstHop.estimatedExecutionTimeMs
  }, [isMultiHopTrade, tradeQuoteFirstHop, tradeQuoteLastHop])

  const stepIndicator = useMemo(() => {
    return <ArrowDownIcon color='gray.500' boxSize={5} />
  }, [])
  const title = useMemo(() => {
    return totalEstimatedExecutionTimeMs
      ? `Estimated completion ${prettyMilliseconds(totalEstimatedExecutionTimeMs)}`
      : 'Estimated completion time unknown'
  }, [totalEstimatedExecutionTimeMs])
  return (
    <StepperStep
      title={title}
      stepIndicator={stepIndicator}
      stepProps={etaStepProps}
      useSpacer={false}
    />
  )
}

const ExpandedTradeSteps = () => {
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
    // swap,
  } = useAppSelector(state => selectHopExecutionMetadata(state, firstHopExecutionMetadataFilter))

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
    // swap,
  } = useAppSelector(state => selectHopExecutionMetadata(state, lastHopExecutionMetadataFilter))

  return (
    <>
      {firstHopAllowanceApproval.isInitiallyRequired === true ||
      firstHopPermit2.isRequired === true ? (
        <StepperStep
          title={
            firstHopPermit2.isRequired ? 'Awaiting Token Transfer' : 'Token Allowance Approval'
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
          {lastHopAllowanceApproval.isInitiallyRequired === true ||
          lastHopPermit2.isRequired === true ? (
            <StepperStep
              title={
                lastHopPermit2.isRequired ? 'Awaiting Token Transfer' : 'Token Allowance Approval'
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
    </>
  )
}

const ExpandableTradeSteps = () => {
  const [isExpanded, setIsExpanded] = useState(false)
  const summaryStepProps = useMemo(
    () => ({
      alignItems: 'center',
      py: 2,
      onClick: () => setIsExpanded(!isExpanded),
      cursor: 'pointer',
    }),
    [isExpanded],
  )
  const currentHopIndex = useCurrentHopIndex()
  const activeTradeId = useAppSelector(selectActiveQuote)?.id
  const hopExecutionMetadataFilter = useMemo(() => {
    return {
      tradeId: activeTradeId ?? '',
      hopIndex: currentHopIndex ?? 0,
    }
  }, [activeTradeId, currentHopIndex])
  const swapperName = useAppSelector(selectActiveSwapperName)
  const { state: hopExecutionState } = useAppSelector(state =>
    selectHopExecutionMetadata(state, hopExecutionMetadataFilter),
  )

  const titleElement = useMemo(() => {
    if (!hopExecutionState || !swapperName) return null
    const stepSummaryTranslation = getHopExecutionStateSummaryStepTranslation(
      hopExecutionState,
      swapperName,
    )
    if (!stepSummaryTranslation) return null
    return (
      <Flex alignItems='center' justifyContent='space-between' flex={1}>
        <Text translation={stepSummaryTranslation} />
        <HStack mr={2}>
          <Progress value={50} width='100px' size='xs' colorScheme='blue' />
          <ArrowUpDownIcon boxSize={3} color='gray.500' />
        </HStack>
      </Flex>
    )
  }, [hopExecutionState, swapperName])

  if (!titleElement) return null

  return (
    <>
      <StepperStep
        title={titleElement}
        stepIndicator={stepIndicator}
        stepProps={summaryStepProps}
        useSpacer={false}
      />
      <Collapse in={isExpanded}>
        <Box p={4}>
          <ExpandedTradeSteps />
        </Box>
      </Collapse>
    </>
  )
}

// TODO: This will be either: the ETA, current step (condensed), or all steps (expanded)
const InnerSteps = () => {
  const confirmedTradeExecutionState = useAppSelector(selectConfirmedTradeExecutionState)
  const isInitializingOrPreviewing =
    confirmedTradeExecutionState &&
    [TradeExecutionState.Initializing, TradeExecutionState.Previewing].includes(
      confirmedTradeExecutionState,
    )

  if (isInitializingOrPreviewing) {
    return <EtaStep />
  }

  return <ExpandableTradeSteps />
}

const stepContainerProps = { width: '100%', pb: 8 }

// TODO: this will be a Shared component (merged into SharedConfirm), taking Hops
export const TradeConfirmBody = () => {
  const tradeQuoteFirstHop = useAppSelector(selectFirstHop)
  const tradeQuoteLastHop = useAppSelector(selectLastHop)

  if (!tradeQuoteFirstHop || !tradeQuoteLastHop) return null

  return (
    <Card flex={1} bg='transparent' borderWidth={0} borderRadius={0} width='full' boxShadow='none'>
      <HStack width='full' justifyContent='space-between' px={6} marginTop={4}>
        <Stepper index={-1} orientation='vertical' gap='0' my={6} width='full'>
          <AssetSummaryStep
            asset={tradeQuoteFirstHop.sellAsset}
            amountCryptoBaseUnit={tradeQuoteFirstHop.sellAmountIncludingProtocolFeesCryptoBaseUnit}
          />

          <Step {...stepContainerProps}>
            <Box
              bg='background.surface.overlay.base'
              borderRadius='xl'
              borderWidth='1px'
              borderColor='whiteAlpha.100'
              width='full'
              mx={-2}
              flex={1}
              zIndex={2}
            >
              <Stepper
                index={-1}
                orientation='vertical'
                gap='0'
                width='full'
                px={2}
                py={1}
                borderWidth='1px'
                borderColor='border.base'
                borderRadius='xl'
              >
                <InnerSteps />
              </Stepper>
            </Box>

            <StepSeparator />
          </Step>

          <AssetSummaryStep
            asset={tradeQuoteLastHop.buyAsset}
            amountCryptoBaseUnit={tradeQuoteLastHop.buyAmountAfterFeesCryptoBaseUnit}
          />
        </Stepper>
      </HStack>
    </Card>
  )
}
