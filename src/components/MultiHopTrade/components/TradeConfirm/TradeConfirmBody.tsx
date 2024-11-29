import { ArrowDownIcon } from '@chakra-ui/icons'
import { Box, Card, HStack, Stepper } from '@chakra-ui/react'
import type {
  SupportedTradeQuoteStepIndex,
  SwapperName,
  TradeQuote,
  TradeQuoteStep,
} from '@shapeshiftoss/swapper'
import prettyMilliseconds from 'pretty-ms'
import { useMemo } from 'react'
import {
  selectActiveQuote,
  selectActiveSwapperName,
  selectConfirmedTradeExecutionState,
  selectFirstHop,
  selectHopExecutionMetadata,
  selectIsActiveQuoteMultiHop,
  selectLastHop,
} from 'state/slices/tradeQuoteSlice/selectors'
import { HopExecutionState, TradeExecutionState } from 'state/slices/tradeQuoteSlice/types'
import { useAppSelector } from 'state/store'

import { ApprovalStep } from '../MultiHopTradeConfirm/components/ApprovalStep/ApprovalStep'
import { AssetSummaryStep } from '../MultiHopTradeConfirm/components/AssetSummaryStep'
import { HopTransactionStep } from '../MultiHopTradeConfirm/components/HopTransactionStep'
import { StepperStep } from '../MultiHopTradeConfirm/components/StepperStep'

// TODO: this will be in TradeConfirm
const Hop = ({
  tradeQuoteStep,
  hopIndex,
  activeTradeId,
  swapperName,
}: {
  tradeQuoteStep: TradeQuoteStep
  hopIndex: SupportedTradeQuoteStepIndex
  activeTradeId: TradeQuote['id']
  swapperName: SwapperName
}) => {
  const hopExecutionMetadataFilter = useMemo(() => {
    return {
      tradeId: activeTradeId,
      hopIndex,
    }
  }, [activeTradeId, hopIndex])

  const {
    state: hopExecutionState,
    allowanceApproval,
    permit2,
    // swap,
  } = useAppSelector(state => selectHopExecutionMetadata(state, hopExecutionMetadataFilter))

  return (
    <>
      {allowanceApproval.isInitiallyRequired === true || permit2.isRequired === true ? (
        <ApprovalStep
          tradeQuoteStep={tradeQuoteStep}
          hopIndex={hopIndex}
          activeTradeId={activeTradeId}
        />
      ) : null}
      <HopTransactionStep
        swapperName={swapperName}
        tradeQuoteStep={tradeQuoteStep}
        isActive={hopExecutionState === HopExecutionState.AwaitingSwap}
        hopIndex={hopIndex}
        isLastStep={false}
        activeTradeId={activeTradeId}
      />
    </>
  )
}

// TODO: this will be in TradeConfirm
const Hops = () => {
  const tradeQuoteFirstHop = useAppSelector(selectFirstHop)
  const tradeQuoteLastHop = useAppSelector(selectLastHop)
  const activeQuote = useAppSelector(selectActiveQuote)
  const swapperName = useAppSelector(selectActiveSwapperName)
  const activeTradeId = activeQuote?.id
  const isMultiHopTrade = useAppSelector(selectIsActiveQuoteMultiHop)

  if (!tradeQuoteFirstHop || !tradeQuoteLastHop || !activeTradeId || !swapperName) return null

  return (
    <>
      <Hop
        tradeQuoteStep={tradeQuoteFirstHop}
        hopIndex={0}
        activeTradeId={activeTradeId}
        swapperName={swapperName}
      />
      {isMultiHopTrade && (
        <Hop
          tradeQuoteStep={tradeQuoteLastHop}
          hopIndex={1}
          activeTradeId={activeTradeId}
          swapperName={swapperName}
        />
      )}
    </>
  )
}

const stepProps = { alignItems: 'center', py: 2 }

const EtaStep = () => {
  const tradeQuoteFirstHop = useAppSelector(selectFirstHop)
  const tradeQuoteLastHop = useAppSelector(selectLastHop)
  const isMultiHopTrade = useAppSelector(selectIsActiveQuoteMultiHop)
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
      stepProps={stepProps}
      useSpacer={false}
    />
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

  return <Hops />
}

const buyAssetStepProps = { mt: 6 }

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

          <Box
            bg='background.surface.overlay.base'
            borderRadius='xl'
            width='full'
            position='relative'
            zIndex={1}
          >
            <Stepper
              index={-1}
              orientation='vertical'
              gap='0'
              width='full'
              px={0}
              py={1}
              borderWidth='1px'
              borderColor='border.base'
              borderRadius='xl'
            >
              <InnerSteps />
            </Stepper>
          </Box>

          <AssetSummaryStep
            asset={tradeQuoteLastHop.buyAsset}
            amountCryptoBaseUnit={tradeQuoteLastHop.buyAmountAfterFeesCryptoBaseUnit}
            stepProps={buyAssetStepProps}
          />
        </Stepper>
      </HStack>
    </Card>
  )
}
