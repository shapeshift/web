import { WarningIcon } from '@chakra-ui/icons'
import { Circle, Flex, Skeleton, Tag, Tooltip } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { TradeQuoteError as SwapperTradeQuoteError } from '@shapeshiftoss/swapper'
import type { FC, JSX } from 'react'
import { memo, useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { TradeQuoteCard } from './components/TradeQuoteCard'
import { TradeQuoteContent } from './components/TradeQuoteContent'

import { SlippageIcon } from '@/components/Icons/Slippage'
import { getQuoteErrorTranslation } from '@/components/MultiHopTrade/components/TradeInput/getQuoteErrorTranslation'
import { RawText } from '@/components/Text'
import { TooltipWithTouch } from '@/components/TooltipWithTouch'
import { useLocaleFormatter } from '@/hooks/useLocaleFormatter/useLocaleFormatter'
import { bn, bnOrZero } from '@/lib/bignumber/bignumber'
import type { ApiQuote } from '@/state/apis/swapper/types'
import { TradeQuoteValidationError } from '@/state/apis/swapper/types'
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
  selectInputSellAsset,
  selectUserSlippagePercentageDecimal,
} from '@/state/slices/tradeInputSlice/selectors'
import {
  getBuyAmountAfterFeesCryptoPrecision,
  getTotalNetworkFeeUserCurrencyPrecision,
} from '@/state/slices/tradeQuoteSlice/helpers'
import { tradeQuoteSlice } from '@/state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { store, useAppDispatch, useAppSelector } from '@/state/store'

const WarningCircle: FC = () => (
  <Circle size={6}>
    <WarningIcon color='text.error' boxSize={4} />
  </Circle>
)

type TradeQuoteProps = {
  isActive: boolean
  isBest?: boolean
  isFastest?: boolean
  isLowestGas?: boolean
  quoteData: ApiQuote
  bestTotalReceiveAmountCryptoPrecision: string | undefined
  isLoading: boolean
  onBack?: () => void
}

export const TradeQuote: FC<TradeQuoteProps> = memo(
  ({
    isActive,
    isBest,
    isFastest,
    isLowestGas,
    quoteData,
    bestTotalReceiveAmountCryptoPrecision,
    isLoading,
    onBack,
  }) => {
    const { quote, errors, inputOutputRatio, swapperName } = quoteData
    const dispatch = useAppDispatch()
    const translate = useTranslate()

    const {
      number: { toPercent },
    } = useLocaleFormatter()

    const buyAsset = useAppSelector(selectInputBuyAsset)
    const sellAsset = useAppSelector(selectInputSellAsset)

    const userSlippagePercentageDecimal = useAppSelector(selectUserSlippagePercentageDecimal)

    const buyAssetMarketData = useAppSelector(state =>
      selectMarketDataByAssetIdUserCurrency(state, buyAsset.assetId ?? ''),
    )

    const sellAmountCryptoPrecision = useAppSelector(selectInputSellAmountCryptoPrecision)

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
      dispatch(tradeQuoteSlice.actions.setActiveQuote(quoteData))
      onBack && onBack()
    }, [dispatch, onBack, quoteData])

    const feeAsset = useAppSelector(state =>
      selectFeeAssetByChainId(state, sellAsset.chainId ?? ''),
    )
    if (!feeAsset)
      throw new Error(`TradeQuoteLoaded: no fee asset found for chainId ${sellAsset.chainId}!`)

    // the difference percentage is on the receive amount only
    const quoteAmountDifferenceDecimalPercentage = useMemo(() => {
      if (!quote || !bestTotalReceiveAmountCryptoPrecision) return
      return bn(1)
        .minus(
          bn(totalReceiveAmountCryptoPrecision).dividedBy(bestTotalReceiveAmountCryptoPrecision),
        )
        .toNumber()
    }, [bestTotalReceiveAmountCryptoPrecision, quote, totalReceiveAmountCryptoPrecision])

    const isAmountEntered = bnOrZero(sellAmountCryptoPrecision).gt(0)
    const hasNegativeRatio =
      inputOutputRatio !== undefined && isAmountEntered && inputOutputRatio <= 0

    const hasAmountWithPositiveReceive =
      isAmountEntered &&
      (!hasNegativeRatio || isTradingWithoutMarketData) &&
      bnOrZero(totalReceiveAmountCryptoPrecision).isGreaterThan(0)

    const errorCircle: JSX.Element | undefined = useMemo(() => {
      const error = errors?.[0]
      const defaultError = { error: TradeQuoteValidationError.UnknownError }

      if (quote && error !== undefined) {
        const translationParams = getQuoteErrorTranslation(error ?? defaultError)
        const tooltipLabel = translate(
          ...(Array.isArray(translationParams) ? translationParams : [translationParams]),
        )
        return (
          <TooltipWithTouch label={tooltipLabel}>
            <WarningCircle />
          </TooltipWithTouch>
        )
      }

      if (!hasAmountWithPositiveReceive && isAmountEntered) {
        return (
          <TooltipWithTouch label={translate('trade.rates.tags.negativeRatio')}>
            <WarningCircle />
          </TooltipWithTouch>
        )
      }
    }, [errors, hasAmountWithPositiveReceive, isAmountEntered, quote, translate])

    const tags: JSX.Element | undefined = useMemo(() => {
      if (isBest) {
        return (
          <Tag size='sm' colorScheme='green'>
            {translate('common.best')}
          </Tag>
        )
      }
    }, [translate, isBest])

    console.log({ isBest, isFastest, isLowestGas, errors })

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

    const slippage = useMemo(() => {
      if (!quote) return

      // user slippage setting was not applied if:
      // - the user did not input a custom value
      // - the slippage on the quote is different to the custom value
      const isUserSlippageNotApplied =
        userSlippagePercentageDecimal !== undefined &&
        quote.slippageTolerancePercentageDecimal !== userSlippagePercentageDecimal

      if (!isUserSlippageNotApplied && quote.slippageTolerancePercentageDecimal === undefined) {
        return
      }

      const tooltip = (() => {
        if (isUserSlippageNotApplied) {
          return translate('trade.quote.cantSetSlippage', {
            userSlippageFormatted: toPercent(userSlippagePercentageDecimal),
            swapperName,
          })
        }

        return translate('trade.quote.slippage', {
          slippageFormatted: toPercent(quote.slippageTolerancePercentageDecimal ?? '0'),
        })
      })()

      const slippageElement = (() => {
        const autoSlippagePercentage =
          quote.isStreaming && isUserSlippageNotApplied
            ? translate('trade.slippage.auto')
            : undefined
        const userSlippagePercentage =
          quote.slippageTolerancePercentageDecimal !== undefined
            ? toPercent(quote.slippageTolerancePercentageDecimal)
            : undefined

        const slippagePercentageOrAuto = autoSlippagePercentage ?? userSlippagePercentage

        if (!slippagePercentageOrAuto) return null

        return (
          <RawText color={isUserSlippageNotApplied ? 'text.error' : undefined}>
            {slippagePercentageOrAuto}
          </RawText>
        )
      })()

      return (
        <Skeleton isLoaded={!isLoading}>
          <Tooltip label={tooltip}>
            <Flex gap={2} alignItems='center'>
              <RawText color={isUserSlippageNotApplied ? 'text.error' : 'text.subtle'}>
                <SlippageIcon />
              </RawText>
              {slippageElement}
              {isUserSlippageNotApplied && <WarningIcon color='text.error' />}
            </Flex>
          </Tooltip>
        </Skeleton>
      )
    }, [isLoading, quote, swapperName, toPercent, translate, userSlippagePercentageDecimal])

    const headerContent = useMemo(() => {
      return (
        <Flex gap={2} alignItems='center'>
          <Skeleton isLoaded={!isLoading}>
            {errorCircle}
            {tags}
          </Skeleton>
        </Flex>
      )
    }, [isLoading, errorCircle, tags])

    const bodyContent = useMemo(() => {
      return quote ? (
        <TradeQuoteContent
          isLoading={isLoading}
          buyAsset={buyAsset}
          isBest={isBest}
          numHops={quote?.steps.length}
          totalReceiveAmountFiatUserCurrency={totalReceiveAmountFiatPrecision}
          hasAmountWithPositiveReceive={hasAmountWithPositiveReceive}
          totalReceiveAmountCryptoPrecision={totalReceiveAmountCryptoPrecision}
          quoteDifferenceDecimalPercentage={quoteAmountDifferenceDecimalPercentage}
          networkFeeFiatUserCurrency={networkFeeUserCurrencyPrecision}
          totalEstimatedExecutionTimeMs={totalEstimatedExecutionTimeMs}
          slippage={slippage}
          tradeQuote={quote}
        />
      ) : null
    }, [
      buyAsset,
      hasAmountWithPositiveReceive,
      isBest,
      isLoading,
      networkFeeUserCurrencyPrecision,
      quote,
      quoteAmountDifferenceDecimalPercentage,
      slippage,
      totalEstimatedExecutionTimeMs,
      totalReceiveAmountCryptoPrecision,
      totalReceiveAmountFiatPrecision,
    ])

    return showSwapper ? (
      <TradeQuoteCard
        title={quote?.steps[0].source ?? quoteData.swapperName}
        swapperName={quoteData.swapperName}
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
