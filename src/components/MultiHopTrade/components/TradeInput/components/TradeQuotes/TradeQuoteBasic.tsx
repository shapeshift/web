import { Flex, useBreakpointValue } from '@chakra-ui/react'
import { TradeQuoteError as SwapperTradeQuoteError } from '@shapeshiftoss/swapper'
import type { FC } from 'react'
import { memo, useCallback, useMemo } from 'react'

import { SwapperIcon } from '../SwapperIcon/SwapperIcon'
import {
  TradeQuoteCard,
  TradeQuoteCardBadges,
  TradeQuoteCardError,
  TradeQuoteCardHeader,
  TradeQuoteCardMeta,
  TradeQuoteCardMetaGas,
  TradeQuoteCardMetaTimeEstimate,
  TradeQuoteCardValue,
} from './components/TradeQuoteBase'
import type { TradeQuoteProps } from './TradeQuote'

import { bn, bnOrZero } from '@/lib/bignumber/bignumber'
import { TradeQuoteValidationError } from '@/state/apis/swapper/types'
import {
  selectFeeAssetByChainId,
  selectIsAssetWithoutMarketData,
  selectMarketDataByAssetIdUserCurrency,
} from '@/state/slices/selectors'
import {
  selectInputBuyAsset,
  selectInputSellAmountCryptoPrecision,
  selectInputSellAmountUserCurrency,
  selectInputSellAsset,
} from '@/state/slices/tradeInputSlice/selectors'
import {
  checkHasAmountWithPositiveReceive,
  getBuyAmountAfterFeesCryptoPrecision,
  getNetworkFeeUserCurrencyPrecision,
} from '@/state/slices/tradeQuoteSlice/helpers'
import { tradeQuoteSlice } from '@/state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

export const TradeQuoteBasic: FC<TradeQuoteProps> = memo(
  ({ isActive, isBest, isFastest, isLowestGas, quoteData, isLoading, onBack }) => {
    const { quote, errors, inputOutputRatio } = quoteData
    const dispatch = useAppDispatch()

    const isMobile = useBreakpointValue({ base: true, sm: false })

    const buyAsset = useAppSelector(selectInputBuyAsset)
    const sellAsset = useAppSelector(selectInputSellAsset)

    const buyAssetMarketData = useAppSelector(state =>
      selectMarketDataByAssetIdUserCurrency(state, buyAsset.assetId ?? ''),
    )

    const isSellAssetWithoutMarketData = useAppSelector(state =>
      selectIsAssetWithoutMarketData(state, sellAsset.assetId),
    )
    const isBuyAssetWithoutMarketData = useAppSelector(state =>
      selectIsAssetWithoutMarketData(state, buyAsset.assetId),
    )

    const sellAmountCryptoPrecision = useAppSelector(selectInputSellAmountCryptoPrecision)
    const sellAmountUserCurrency = useAppSelector(selectInputSellAmountUserCurrency)

    const networkFeeUserCurrencyPrecision = useMemo(
      () => getNetworkFeeUserCurrencyPrecision(quote),
      [quote],
    )

    // NOTE: don't pull this from the slice - we're not displaying the active quote here
    const totalReceiveAmountCryptoPrecision = useMemo(
      () => (quote ? getBuyAmountAfterFeesCryptoPrecision({ quote }) : '0'),
      [quote],
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

    const isAmountEntered = bnOrZero(sellAmountCryptoPrecision).gt(0)
    const hasNegativeRatio =
      inputOutputRatio !== undefined && isAmountEntered && inputOutputRatio <= 0

    const isTradingWithoutMarketData = isSellAssetWithoutMarketData || isBuyAssetWithoutMarketData
    const hasAmountWithPositiveReceive = checkHasAmountWithPositiveReceive(
      isAmountEntered,
      hasNegativeRatio,
      isTradingWithoutMarketData,
      totalReceiveAmountCryptoPrecision,
    )

    const isDisabled = !quote || isLoading
    const showSwapperError = ![
      TradeQuoteValidationError.UnknownError,
      SwapperTradeQuoteError.UnknownError,
    ].includes(errors?.[0]?.error)
    const showSwapper = !!quote || showSwapperError

    if (!showSwapper) return null

    return (
      <TradeQuoteCard
        onClick={handleQuoteSelection}
        isActive={isActive}
        isActionable={hasAmountWithPositiveReceive && errors.length === 0}
        isDisabled={isDisabled}
      >
        <TradeQuoteCardHeader>
          <Flex gap={2}>
            <SwapperIcon swapperName={quoteData.swapperName} withTooltip />
          </Flex>
          <Flex gap={2}>
            <TradeQuoteCardError
              errors={errors}
              hasAmountWithPositiveReceive={hasAmountWithPositiveReceive}
              isAmountEntered={isAmountEntered}
            />
            <TradeQuoteCardBadges
              isBest={isBest}
              isFastest={isFastest}
              isLowestGas={isLowestGas}
              iconOnlyIfCount={isMobile ? 3 : undefined}
            />
          </Flex>
        </TradeQuoteCardHeader>
        {quote && (
          <>
            <TradeQuoteCardValue
              isLoading={isLoading}
              isCryptoAmountValid={hasAmountWithPositiveReceive}
              isTradingWithoutMarketData={isTradingWithoutMarketData}
              cryptoAmount={totalReceiveAmountCryptoPrecision}
              buyAsset={buyAsset}
              buyAssetMarketData={buyAssetMarketData}
              sellAmountUserCurrency={sellAmountUserCurrency}
            />
            <TradeQuoteCardMeta>
              <TradeQuoteCardMetaGas
                gas={
                  networkFeeUserCurrencyPrecision !== undefined
                    ? bn(networkFeeUserCurrencyPrecision).toNumber()
                    : undefined
                }
                isLoading={isLoading}
              />
              <TradeQuoteCardMetaTimeEstimate quoteSteps={quote.steps} isLoading={isLoading} />
            </TradeQuoteCardMeta>
          </>
        )}
      </TradeQuoteCard>
    )
  },
)
