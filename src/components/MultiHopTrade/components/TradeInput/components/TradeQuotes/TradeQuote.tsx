import { WarningIcon } from '@chakra-ui/icons'
import { Box, Circle, Flex, Skeleton } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import {
  CHAINFLIP_BOOST_SWAP_SOURCE,
  CHAINFLIP_DCA_BOOST_SWAP_SOURCE,
  TradeQuoteError as SwapperTradeQuoteError,
} from '@shapeshiftoss/swapper'
import type { FC, JSX } from 'react'
import { memo, useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { SwapperIcon } from '../SwapperIcon/SwapperIcon'
import { TradeQuoteBadges } from './components/TradeQuoteBadges'
import { TradeQuoteCard } from './components/TradeQuoteCard'
import { TradeQuoteContent } from './components/TradeQuoteContent'
import { TradeQuoteExchangeRate } from './components/TradeQuoteExchangeRate'

import { getQuoteErrorTranslation } from '@/components/MultiHopTrade/components/TradeInput/getQuoteErrorTranslation'
import { TooltipWithTouch } from '@/components/TooltipWithTouch'
import { bn, bnOrZero } from '@/lib/bignumber/bignumber'
import { vibrate } from '@/lib/vibrate'
import type { ApiQuote } from '@/state/apis/swapper/types'
import { TradeQuoteValidationError } from '@/state/apis/swapper/types'
import { preferences, QuoteDisplayOption } from '@/state/slices/preferencesSlice/preferencesSlice'
import {
  selectFeeAssetByChainId,
  selectFeeAssetById,
  selectIsAssetWithoutMarketData,
  selectMarketDataByAssetIdUserCurrency,
  selectMarketDataByFilter,
} from '@/state/slices/selectors'
import {
  selectInputBuyAsset,
  selectInputSellAmountCryptoPrecision,
  selectInputSellAmountUserCurrency,
  selectInputSellAsset,
  selectUserSlippagePercentageDecimal,
} from '@/state/slices/tradeInputSlice/selectors'
import {
  getBuyAmountAfterFeesCryptoPrecision,
  getTotalNetworkFeeUserCurrencyPrecision,
} from '@/state/slices/tradeQuoteSlice/helpers'
import { tradeQuoteSlice } from '@/state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { store, useAppDispatch, useAppSelector } from '@/state/store'

type TradeQuoteProps = {
  isActive: boolean
  isBestRate?: boolean
  isFastest?: boolean
  isLowestGas?: boolean
  quoteData: ApiQuote
  isLoading: boolean
  onBack?: () => void
}

export const TradeQuote: FC<TradeQuoteProps> = memo(
  ({ isActive, isBestRate, isFastest, isLowestGas, quoteData, isLoading, onBack }) => {
    const { quote, errors, inputOutputRatio } = quoteData
    const dispatch = useAppDispatch()
    const translate = useTranslate()

    const buyAsset = useAppSelector(selectInputBuyAsset)
    const sellAsset = useAppSelector(selectInputSellAsset)

    const quoteDisplayOption = useAppSelector(preferences.selectors.selectQuoteDisplayOption)

    const userSlippagePercentageDecimal = useAppSelector(selectUserSlippagePercentageDecimal)

    const buyAssetMarketData = useAppSelector(state =>
      selectMarketDataByAssetIdUserCurrency(state, buyAsset.assetId ?? ''),
    )

    const sellAmountCryptoPrecision = useAppSelector(selectInputSellAmountCryptoPrecision)
    const sellAmountUserCurrency = useAppSelector(selectInputSellAmountUserCurrency)

    // NOTE: don't pull this from the slice - we're not displaying the active quote here
    const networkFeeUserCurrencyPrecision = useMemo(() => {
      if (!quote) return
      const state = store.getState()
      const getFeeAsset = (assetId: AssetId) => {
        const feeAsset = selectFeeAssetById(state, assetId)
        if (feeAsset === undefined) {
          throw Error(`missing fee asset for assetId ${assetId}`)
        }
        return feeAsset
      }
      const getFeeAssetUserCurrencyRate = (feeAssetId: AssetId) =>
        selectMarketDataByFilter(state, {
          assetId: feeAssetId,
        })?.price

      return getTotalNetworkFeeUserCurrencyPrecision(
        quote,
        getFeeAsset,
        getFeeAssetUserCurrencyRate,
      )?.toString()
    }, [quote])

    // NOTE: don't pull this from the slice - we're not displaying the active quote here
    const totalReceiveAmountCryptoPrecision = useMemo(
      () =>
        quote
          ? getBuyAmountAfterFeesCryptoPrecision({
              quote,
            })
          : '0',
      [quote],
    )

    const isSellAssetWithoutMarketData = useAppSelector(state =>
      selectIsAssetWithoutMarketData(state, sellAsset.assetId),
    )
    const isBuyAssetWithoutMarketData = useAppSelector(state =>
      selectIsAssetWithoutMarketData(state, buyAsset.assetId),
    )
    const isTradingWithoutMarketData = isSellAssetWithoutMarketData || isBuyAssetWithoutMarketData

    const totalReceiveAmountFiatPrecision = useMemo(
      () =>
        isTradingWithoutMarketData
          ? undefined
          : bn(totalReceiveAmountCryptoPrecision)
              .times(bnOrZero(buyAssetMarketData?.price))
              .toString(),
      [buyAssetMarketData?.price, isTradingWithoutMarketData, totalReceiveAmountCryptoPrecision],
    )

    const handleQuoteSelection = useCallback(() => {
      vibrate('heavy')
      dispatch(tradeQuoteSlice.actions.setActiveQuote(quoteData))
      onBack && onBack()
    }, [dispatch, onBack, quoteData])

    const feeAsset = useAppSelector(state =>
      selectFeeAssetByChainId(state, sellAsset.chainId ?? ''),
    )
    if (!feeAsset)
      throw new Error(`TradeQuoteLoaded: no fee asset found for chainId ${sellAsset.chainId}!`)

    const isAmountEntered = bnOrZero(sellAmountCryptoPrecision).gt(0)
    const hasNegativeRatio =
      inputOutputRatio !== undefined && isAmountEntered && inputOutputRatio <= 0

    const hasAmountWithPositiveReceive =
      isAmountEntered &&
      (!hasNegativeRatio || isTradingWithoutMarketData) &&
      bnOrZero(totalReceiveAmountCryptoPrecision).isGreaterThan(0)

    const errorIndicator: JSX.Element | null = useMemo(() => {
      const error = errors?.[0]
      const defaultError = { error: TradeQuoteValidationError.UnknownError }

      switch (true) {
        case !quote || error !== undefined:
          const translationParams = getQuoteErrorTranslation(error ?? defaultError)
          return (
            <TooltipWithTouch
              label={
                typeof translationParams === 'string'
                  ? translate(translationParams)
                  : translate(...translationParams)
              }
            >
              <Circle size={6}>
                <WarningIcon color='text.error' boxSize={4} />
              </Circle>
            </TooltipWithTouch>
          )
        case !hasAmountWithPositiveReceive && isAmountEntered:
          return (
            <TooltipWithTouch label={translate('trade.rates.tags.negativeRatio')}>
              <Circle size={6}>
                <WarningIcon color='text.error' boxSize={4} />
              </Circle>
            </TooltipWithTouch>
          )
        default:
          return null
      }
    }, [errors, quote, translate, hasAmountWithPositiveReceive, isAmountEntered])

    const isDisabled = !quote || isLoading
    const showSwapperError = ![
      TradeQuoteValidationError.UnknownError,
      SwapperTradeQuoteError.UnknownError,
    ].includes(errors?.[0]?.error)
    const showSwapper = !!quote || showSwapperError

    const totalEstimatedExecutionTimeMs = useMemo(() => {
      if (quote?.steps.every(step => step.estimatedExecutionTimeMs === undefined)) return

      return quote?.steps.reduce((acc, step) => {
        return acc + (step.estimatedExecutionTimeMs ?? 0)
      }, 0)
    }, [quote?.steps])

    const headerContent = useMemo(() => {
      const isBoost =
        quote?.steps[0].source &&
        [CHAINFLIP_BOOST_SWAP_SOURCE, CHAINFLIP_DCA_BOOST_SWAP_SOURCE].includes(
          quote?.steps[0].source,
        )

      return (
        <Flex justifyContent='space-between' alignItems='center' flexGrow={1}>
          {quoteDisplayOption === QuoteDisplayOption.Advanced && quote && (
            <Skeleton isLoaded={!isLoading}>
              <TradeQuoteExchangeRate rate={quote.rate} buyAsset={buyAsset} sellAsset={sellAsset} />
            </Skeleton>
          )}
          <Box ml='auto'>
            <Skeleton isLoaded={!isLoading}>
              <Flex alignItems='center' gap={2}>
                <TradeQuoteBadges
                  isBestRate={quote && isBestRate}
                  isFastest={quote && isFastest}
                  isLowestGas={quote && isLowestGas}
                  isStreaming={quote && quote.isStreaming}
                  isBoost={quote && isBoost}
                  swapperName={quoteData.swapperName}
                  quoteDisplayOption={quoteDisplayOption}
                />
                {errorIndicator}
              </Flex>
            </Skeleton>
          </Box>
        </Flex>
      )
    }, [
      quoteDisplayOption,
      quote,
      isLoading,
      buyAsset,
      sellAsset,
      isBestRate,
      isFastest,
      isLowestGas,
      errorIndicator,
      quoteData.swapperName,
    ])

    const bodyContent = useMemo(() => {
      return quote ? (
        <TradeQuoteContent
          isLoading={isLoading}
          buyAsset={buyAsset}
          quoteDisplayOption={quoteDisplayOption}
          totalReceiveAmountFiatUserCurrency={totalReceiveAmountFiatPrecision}
          hasAmountWithPositiveReceive={hasAmountWithPositiveReceive}
          sellAmountUserCurrency={sellAmountUserCurrency}
          totalReceiveAmountCryptoPrecision={totalReceiveAmountCryptoPrecision}
          networkFeeFiatUserCurrency={networkFeeUserCurrencyPrecision}
          totalEstimatedExecutionTimeMs={totalEstimatedExecutionTimeMs}
          userSlippagePercentageDecimal={userSlippagePercentageDecimal}
          tradeQuote={quote}
        />
      ) : null
    }, [
      buyAsset,
      hasAmountWithPositiveReceive,
      isLoading,
      networkFeeUserCurrencyPrecision,
      quote,
      quoteDisplayOption,
      sellAmountUserCurrency,
      totalEstimatedExecutionTimeMs,
      totalReceiveAmountCryptoPrecision,
      totalReceiveAmountFiatPrecision,
      userSlippagePercentageDecimal,
    ])

    const swapperIcon = useMemo(
      () => <SwapperIcon swapperName={quoteData.swapperName} size='sm' />,
      [quoteData.swapperName],
    )

    return showSwapper ? (
      <TradeQuoteCard
        icon={swapperIcon}
        title={!quote ? quoteData.swapperName : undefined}
        headerContent={headerContent}
        bodyContent={bodyContent}
        onClick={handleQuoteSelection}
        isActive={isActive}
        isActionable={hasAmountWithPositiveReceive && errors.length === 0}
        isDisabled={isDisabled}
      />
    ) : null
  },
)
