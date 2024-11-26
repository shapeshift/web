import { Box, Card, HStack, Stepper } from '@chakra-ui/react'
import type {
  SupportedTradeQuoteStepIndex,
  SwapperName,
  TradeQuote,
  TradeQuoteStep,
} from '@shapeshiftoss/swapper'
import { useMemo } from 'react'
import {
  selectActiveQuote,
  selectActiveSwapperName,
  selectFirstHop,
  selectHopExecutionMetadata,
  selectIsActiveQuoteMultiHop,
  selectLastHop,
} from 'state/slices/tradeQuoteSlice/selectors'
import { HopExecutionState } from 'state/slices/tradeQuoteSlice/types'
import { useAppSelector } from 'state/store'

import { ApprovalStep } from '../MultiHopTradeConfirm/components/ApprovalStep/ApprovalStep'
import { AssetSummaryStep } from '../MultiHopTradeConfirm/components/AssetSummaryStep'
import { HopTransactionStep } from '../MultiHopTradeConfirm/components/HopTransactionStep'

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
    swap,
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

// TODO: this will be a Shared component (merged into SharedConfirm), taking Hops
export const TradeConfirmBody = () => {
  const tradeQuoteFirstHop = useAppSelector(selectFirstHop)
  const tradeQuoteLastHop = useAppSelector(selectLastHop)

  if (!tradeQuoteFirstHop || !tradeQuoteLastHop) return null

  return (
    <Card flex={1} bg='transparent' borderWidth={0} borderRadius={0} width='full' boxShadow='none'>
      <HStack width='full' justifyContent='space-between' px={6} marginTop={4}>
        <Stepper index={-1} orientation='vertical' gap='0' margin={6}>
          <AssetSummaryStep
            asset={tradeQuoteFirstHop.sellAsset}
            amountCryptoBaseUnit={tradeQuoteFirstHop.sellAmountIncludingProtocolFeesCryptoBaseUnit}
          />

          <Box>
            <Stepper index={0} orientation='vertical' gap='0' margin={6}>
              <Hops />
            </Stepper>
          </Box>

          <AssetSummaryStep
            asset={tradeQuoteLastHop.buyAsset}
            amountCryptoBaseUnit={tradeQuoteLastHop.buyAmountAfterFeesCryptoBaseUnit}
          />
        </Stepper>
      </HStack>
    </Card>
  )
}
