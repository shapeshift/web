import { Stepper, usePrevious } from '@chakra-ui/react'
import { foxAssetId } from '@shapeshiftoss/caip'
import { isArbitrumBridgeTradeQuoteOrRate } from '@shapeshiftoss/swapper'
import { useCallback, useEffect, useMemo } from 'react'
import { Redirect, useHistory } from 'react-router-dom'

import { SharedConfirm } from '../SharedConfirm/SharedConfirm'
import { YouCouldHaveSaved } from '../TradeSuccess/components/YouCouldHaveSaved'
import { YouSaved } from '../TradeSuccess/components/YouSaved'
import { TradeSuccess } from '../TradeSuccess/TradeSuccess'
import { ExpandableStepperSteps } from './components/ExpandableStepperSteps'
import { useCurrentHopIndex } from './hooks/useCurrentHopIndex'
import { useIsApprovalInitiallyNeeded } from './hooks/useIsApprovalInitiallyNeeded'
import { TradeConfirmBody } from './TradeConfirmBody'
import { TradeConfirmFooter } from './TradeConfirmFooter'

import { TradeRoutePaths } from '@/components/MultiHopTrade/types'
import type { TextPropTypes } from '@/components/Text/Text'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { fromBaseUnit } from '@/lib/math'
import { selectRelatedAssetIdsInclusiveSorted } from '@/state/slices/related-assets-selectors'
import {
  selectActiveQuote,
  selectConfirmedTradeExecutionState,
  selectFirstHop,
  selectLastHop,
  selectTradeQuoteAffiliateFeeAfterDiscountUserCurrency,
  selectTradeQuoteAffiliateFeeDiscountUserCurrency,
} from '@/state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from '@/state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { TradeExecutionState } from '@/state/slices/tradeQuoteSlice/types'
import { useAppDispatch, useAppSelector, useSelectorWithArgs } from '@/state/store'

export const TradeConfirm = ({ isCompact }: { isCompact: boolean | undefined }) => {
  const { isLoading } = useIsApprovalInitiallyNeeded()
  const history = useHistory()
  const dispatch = useAppDispatch()
  const {
    state: { isConnected },
  } = useWallet()
  const activeQuote = useAppSelector(selectActiveQuote)
  const activeTradeId = activeQuote?.id
  const currentHopIndex = useCurrentHopIndex()
  const tradeQuoteFirstHop = useAppSelector(selectFirstHop)
  const tradeQuoteLastHop = useAppSelector(selectLastHop)
  const tradeQuoteStep = useMemo(() => {
    return currentHopIndex === 0 ? tradeQuoteFirstHop : tradeQuoteLastHop
  }, [currentHopIndex, tradeQuoteFirstHop, tradeQuoteLastHop])

  const confirmedTradeExecutionState = useAppSelector(selectConfirmedTradeExecutionState)
  const prevIsConnected = usePrevious(isConnected)

  const isTradeComplete = useMemo(
    () => confirmedTradeExecutionState === TradeExecutionState.TradeComplete,
    [confirmedTradeExecutionState],
  )

  const handleBack = useCallback(() => {
    if (isTradeComplete) {
      dispatch(tradeQuoteSlice.actions.clear())
    }

    history.push(TradeRoutePaths.Input)
  }, [dispatch, history, isTradeComplete])

  useEffect(() => {
    if (prevIsConnected && !isConnected) {
      handleBack()
    }
  }, [isConnected, prevIsConnected, handleBack])

  const headerTranslation: TextPropTypes['translation'] | undefined = useMemo(() => {
    if (!confirmedTradeExecutionState) return undefined
    return [TradeExecutionState.Initializing, TradeExecutionState.Previewing].includes(
      confirmedTradeExecutionState,
    )
      ? 'trade.confirmDetails'
      : 'trade.trade'
  }, [confirmedTradeExecutionState])

  useEffect(() => {
    if (isLoading || !activeQuote) return
    // Only set the trade to initialized if it was actually initializing previously. Now that we shove quotes in at confirm time, we can't rely on this effect only running once.
    if (confirmedTradeExecutionState !== TradeExecutionState.Initializing) return

    dispatch(tradeQuoteSlice.actions.setTradeInitialized(activeQuote.id))
  }, [dispatch, isLoading, activeQuote, confirmedTradeExecutionState])

  const footer = useMemo(() => {
    if (isTradeComplete && activeQuote && tradeQuoteLastHop) return null
    if (!tradeQuoteStep || !activeTradeId) return null
    return (
      <TradeConfirmFooter
        isCompact={isCompact}
        tradeQuoteStep={tradeQuoteStep}
        activeTradeId={activeTradeId}
      />
    )
  }, [isTradeComplete, activeQuote, tradeQuoteLastHop, tradeQuoteStep, activeTradeId, isCompact])

  const isArbitrumBridgeWithdraw = useMemo(() => {
    return isArbitrumBridgeTradeQuoteOrRate(activeQuote) && activeQuote.direction === 'withdrawal'
  }, [activeQuote])

  const firstHop = useAppSelector(selectFirstHop)
  const lastHop = useAppSelector(selectLastHop)

  const feeSavingUserCurrency = useAppSelector(selectTradeQuoteAffiliateFeeDiscountUserCurrency)
  const affiliateFeeUserCurrency = useAppSelector(
    selectTradeQuoteAffiliateFeeAfterDiscountUserCurrency,
  )
  const hasFeeSaving = !bnOrZero(feeSavingUserCurrency).isZero()
  const couldHaveReducedFee = !hasFeeSaving && !bnOrZero(affiliateFeeUserCurrency).isZero()

  const relatedAssetIdsFilter = useMemo(
    () => ({
      assetId: foxAssetId,
      onlyConnectedChains: false,
    }),
    [],
  )

  const relatedAssetIds = useSelectorWithArgs(
    selectRelatedAssetIdsInclusiveSorted,
    relatedAssetIdsFilter,
  )

  // NOTE: This is a temporary solution to enable the Fox discount summary only if the user did NOT

  // trade FOX. If a user trades FOX, the discount calculations will have changed from the correct
  // values because the amount of FOX held in the wallet will have changed.
  // See https://github.com/shapeshift/web/issues/8028 for more details.
  const enableFoxDiscountSummary = useMemo(() => {
    const didTradeFox = relatedAssetIds.some(assetId => {
      return (
        firstHop?.buyAsset.assetId === assetId ||
        firstHop?.sellAsset.assetId === assetId ||
        lastHop?.buyAsset.assetId === assetId ||
        lastHop?.sellAsset.assetId === assetId
      )
    })

    return !didTradeFox
  }, [firstHop, lastHop, relatedAssetIds])

  const feeSummaryContent = useMemo(() => {
    if (!enableFoxDiscountSummary) return

    return (
      <>
        {hasFeeSaving && feeSavingUserCurrency && (
          <YouSaved feeSavingUserCurrency={feeSavingUserCurrency} />
        )}
        {couldHaveReducedFee && affiliateFeeUserCurrency && (
          <YouCouldHaveSaved affiliateFeeUserCurrency={affiliateFeeUserCurrency} />
        )}
      </>
    )
  }, [
    enableFoxDiscountSummary,
    hasFeeSaving,
    feeSavingUserCurrency,
    couldHaveReducedFee,
    affiliateFeeUserCurrency,
  ])

  const body = useMemo(() => {
    if (isTradeComplete && activeQuote && tradeQuoteLastHop)
      return (
        <TradeSuccess
          handleBack={handleBack}
          titleTranslation={
            isArbitrumBridgeWithdraw
              ? 'bridge.arbitrum.success.tradeSuccess'
              : 'trade.temp.tradeSuccess'
          }
          buttonTranslation='trade.doAnotherTrade'
          summaryTranslation='trade.summary'
          sellAsset={activeQuote?.steps[0].sellAsset}
          buyAsset={tradeQuoteLastHop.buyAsset}
          sellAmountCryptoPrecision={fromBaseUnit(
            activeQuote.steps[0].sellAmountIncludingProtocolFeesCryptoBaseUnit,
            activeQuote.steps[0].sellAsset.precision,
          )}
          quoteBuyAmountCryptoPrecision={fromBaseUnit(
            tradeQuoteLastHop.buyAmountAfterFeesCryptoBaseUnit,
            tradeQuoteLastHop.buyAsset.precision,
          )}
          extraContent={feeSummaryContent}
        >
          <Stepper index={-1} orientation='vertical' gap='0' my={6}>
            <ExpandableStepperSteps isExpanded />
          </Stepper>
        </TradeSuccess>
      )

    return <TradeConfirmBody />
  }, [
    activeQuote,
    handleBack,
    isArbitrumBridgeWithdraw,
    isTradeComplete,
    tradeQuoteLastHop,
    feeSummaryContent,
  ])

  // We should have some execution state here... unless we're rehydrating or trying to access /trade/confirm directly
  if (!confirmedTradeExecutionState) return <Redirect to={TradeRoutePaths.Input} />
  if (!headerTranslation) return null

  return (
    <SharedConfirm
      bodyContent={body}
      footerContent={footer}
      isLoading={isLoading}
      onBack={handleBack}
      headerTranslation={headerTranslation}
    />
  )
}
