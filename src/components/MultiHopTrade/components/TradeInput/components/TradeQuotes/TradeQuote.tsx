import { WarningIcon } from '@chakra-ui/icons'
import { Collapse, Flex, Skeleton, Tag, Tooltip, useDisclosure } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { TradeQuoteError as SwapperTradeQuoteError } from '@shapeshiftoss/swapper'
import type { FC } from 'react'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { SlippageIcon } from 'components/Icons/Slippage'
import { getQuoteErrorTranslation } from 'components/MultiHopTrade/components/TradeInput/getQuoteErrorTranslation'
import { TwirlyToggle } from 'components/MultiHopTrade/components/TwirlyToggle'
import { useIsTradingActive } from 'components/MultiHopTrade/hooks/useIsTradingActive'
import { RawText } from 'components/Text'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { type ApiQuote, TradeQuoteValidationError } from 'state/apis/swapper'
import {
  selectFeeAssetByChainId,
  selectFeeAssetById,
  selectInputBuyAsset,
  selectInputSellAmountCryptoPrecision,
  selectInputSellAsset,
  selectMarketDataByFilter,
  selectMarketDataById,
  selectUserSlippagePercentageDecimal,
} from 'state/slices/selectors'
import {
  getBuyAmountAfterFeesCryptoPrecision,
  getTotalNetworkFeeUserCurrencyPrecision,
} from 'state/slices/tradeQuoteSlice/helpers'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { store, useAppDispatch, useAppSelector } from 'state/store'

import { TradeQuoteCard } from './components/TradeQuoteCard'
import { TradeQuoteContent } from './components/TradeQuoteContent'

type TradeQuoteProps = {
  isActive: boolean
  isBest: boolean
  quoteData: ApiQuote
  bestBuyAmountBeforeFeesCryptoBaseUnit: string
  isLoading: boolean
}

export const TradeQuoteLoaded: FC<TradeQuoteProps> = ({
  isActive,
  isBest,
  quoteData,
  bestBuyAmountBeforeFeesCryptoBaseUnit,
  isLoading,
}) => {
  const { quote, errors } = quoteData

  const dispatch = useAppDispatch()
  const translate = useTranslate()
  const { isOpen, onToggle } = useDisclosure({
    defaultIsOpen: errors.length === 0,
  })

  const {
    number: { toPercent },
  } = useLocaleFormatter()

  const { isTradingActive } = useIsTradingActive()

  const buyAsset = useAppSelector(selectInputBuyAsset)
  const sellAsset = useAppSelector(selectInputSellAsset)
  const userSlippagePercentageDecimal = useAppSelector(selectUserSlippagePercentageDecimal)

  const buyAssetMarketData = useAppSelector(state =>
    selectMarketDataById(state, buyAsset.assetId ?? ''),
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
      }).price

    return getTotalNetworkFeeUserCurrencyPrecision(
      quote,
      getFeeAsset,
      getFeeAssetUserCurrencyRate,
    ).toString()
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

  const totalReceiveAmountFiatPrecision = useMemo(
    () =>
      bn(totalReceiveAmountCryptoPrecision)
        .times(buyAssetMarketData.price ?? 0)
        .toString(),
    [buyAssetMarketData.price, totalReceiveAmountCryptoPrecision],
  )

  const handleQuoteSelection = useCallback(() => {
    dispatch(
      tradeQuoteSlice.actions.setActiveQuoteId(
        quoteData.quote
          ? {
              swapperName: quoteData.swapperName,
              quoteId: quoteData.quote.id,
            }
          : undefined,
      ),
    )
  }, [dispatch, quoteData])

  const feeAsset = useAppSelector(state => selectFeeAssetByChainId(state, sellAsset.chainId ?? ''))
  if (!feeAsset)
    throw new Error(`TradeQuoteLoaded: no fee asset found for chainId ${sellAsset.chainId}!`)

  // the difference percentage is on the gross receive amount only
  const quoteDifferenceDecimalPercentage = useMemo(() => {
    if (!quote) return Infinity
    const lastStep = quote.steps[quote.steps.length - 1]
    return bn(bestBuyAmountBeforeFeesCryptoBaseUnit)
      .minus(lastStep.buyAmountBeforeFeesCryptoBaseUnit)
      .dividedBy(bestBuyAmountBeforeFeesCryptoBaseUnit)
      .toNumber()
  }, [bestBuyAmountBeforeFeesCryptoBaseUnit, quote])

  const isAmountEntered = bnOrZero(sellAmountCryptoPrecision).gt(0)
  const hasNegativeRatio =
    quoteData.inputOutputRatio !== undefined && isAmountEntered && quoteData.inputOutputRatio <= 0

  const hasAmountWithPositiveReceive =
    isAmountEntered &&
    !hasNegativeRatio &&
    bnOrZero(totalReceiveAmountCryptoPrecision).isGreaterThan(0)

  const tag: JSX.Element = useMemo(() => {
    const error = errors?.[0]
    const defaultError = { error: TradeQuoteValidationError.UnknownError }

    switch (true) {
      case !quote || error !== undefined:
        const translationParams = getQuoteErrorTranslation(error ?? defaultError)
        return (
          <Tag size='sm' colorScheme='red'>
            {translate(
              ...(Array.isArray(translationParams) ? translationParams : [translationParams]),
            )}
          </Tag>
        )
      case !hasAmountWithPositiveReceive && isAmountEntered:
        return (
          <Tag size='sm' colorScheme='red'>
            {translate('trade.rates.tags.negativeRatio')}
          </Tag>
        )
      case isBest:
        return (
          <Tag size='sm' colorScheme='green'>
            {translate('common.best')}
          </Tag>
        )
      default:
        return <Tag size='sm'>{translate('common.alternative')}</Tag>
    }
  }, [errors, quote, translate, hasAmountWithPositiveReceive, isAmountEntered, isBest])

  const isDisabled = !quote || errors?.length > 0
  const showSwapperError = ![
    TradeQuoteValidationError.UnknownError,
    SwapperTradeQuoteError.UnknownError,
  ].includes(errors?.[0]?.error)
  const showSwapper = !!quote || showSwapperError

  const totalEstimatedExecutionTimeMs = useMemo(
    () =>
      quote?.steps.reduce((acc, step) => {
        return acc + (step.estimatedExecutionTimeMs ?? 0)
      }, 0),
    [quote?.steps],
  )

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
          swapperName: quoteData.swapperName,
        })
      }

      return translate('trade.quote.slippage', {
        slippageFormatted: toPercent(quote.slippageTolerancePercentageDecimal ?? '0'),
      })
    })()

    return (
      <Skeleton isLoaded={!isLoading}>
        <Tooltip label={tooltip}>
          <Flex gap={2} alignItems='center'>
            <RawText color={isUserSlippageNotApplied ? 'text.error' : 'text.subtle'}>
              <SlippageIcon />
            </RawText>
            {quote.slippageTolerancePercentageDecimal !== undefined && (
              <RawText color={isUserSlippageNotApplied ? 'text.error' : undefined}>
                {toPercent(quote.slippageTolerancePercentageDecimal)}
              </RawText>
            )}
            {isUserSlippageNotApplied && <WarningIcon color='text.error' />}
          </Flex>
        </Tooltip>
      </Skeleton>
    )
  }, [isLoading, quote, quoteData.swapperName, toPercent, translate, userSlippagePercentageDecimal])

  const headerContent = useMemo(() => {
    return (
      <Flex gap={2}>
        <Skeleton isLoaded={!isLoading}>{tag}</Skeleton>
        {isDisabled && quote && <TwirlyToggle isOpen={isOpen} onToggle={onToggle} />}
      </Flex>
    )
  }, [isDisabled, isLoading, isOpen, onToggle, quote, tag])

  const bodyContent = useMemo(() => {
    return quote ? (
      <Collapse in={isOpen}>
        <TradeQuoteContent
          isLoading={isLoading}
          buyAsset={buyAsset}
          isBest={isBest}
          numHops={quote?.steps.length}
          totalReceiveAmountFiatPrecision={totalReceiveAmountFiatPrecision}
          hasAmountWithPositiveReceive={hasAmountWithPositiveReceive}
          totalReceiveAmountCryptoPrecision={totalReceiveAmountCryptoPrecision}
          quoteDifferenceDecimalPercentage={quoteDifferenceDecimalPercentage}
          networkFeeUserCurrencyPrecision={networkFeeUserCurrencyPrecision}
          totalEstimatedExecutionTimeMs={totalEstimatedExecutionTimeMs}
          slippage={slippage}
        />
      </Collapse>
    ) : null
  }, [
    buyAsset,
    hasAmountWithPositiveReceive,
    isBest,
    isLoading,
    isOpen,
    networkFeeUserCurrencyPrecision,
    quote,
    quoteDifferenceDecimalPercentage,
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
      isActionable={isTradingActive && hasAmountWithPositiveReceive && errors.length === 0}
      isDisabled={isDisabled}
    />
  ) : null
}

export const TradeQuote: FC<TradeQuoteProps> = props => <TradeQuoteLoaded {...props} />
