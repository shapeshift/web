import { WarningIcon } from '@chakra-ui/icons'
import {
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Collapse,
  Flex,
  Skeleton,
  Tag,
  Tooltip,
  useColorModeValue,
  useDisclosure,
} from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { TradeQuoteError as SwapperTradeQuoteError } from '@shapeshiftoss/swapper'
import prettyMilliseconds from 'pretty-ms'
import type { FC } from 'react'
import { useCallback, useMemo } from 'react'
import { BsLayers } from 'react-icons/bs'
import { FaGasPump, FaRegClock } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { SlippageIcon } from 'components/Icons/Slippage'
import { getQuoteErrorTranslation } from 'components/MultiHopTrade/components/TradeInput/getQuoteErrorTranslation'
import { TwirlyToggle } from 'components/MultiHopTrade/components/TwirlyToggle'
import { useIsTradingActive } from 'components/MultiHopTrade/hooks/useIsTradingActive'
import { RawText } from 'components/Text'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { type ApiQuote, TradeQuoteValidationError } from 'state/apis/swappers'
import {
  selectBuyAsset,
  selectFeeAssetByChainId,
  selectFeeAssetById,
  selectMarketDataByFilter,
  selectMarketDataById,
  selectSellAmountCryptoPrecision,
  selectSellAsset,
  selectUserSlippagePercentageDecimal,
} from 'state/slices/selectors'
import {
  getBuyAmountAfterFeesCryptoPrecision,
  getTotalNetworkFeeUserCurrencyPrecision,
} from 'state/slices/tradeQuoteSlice/helpers'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { store, useAppDispatch, useAppSelector } from 'state/store'

import { SwapperIcon } from '../SwapperIcon/SwapperIcon'

type TradeQuoteProps = {
  isActive: boolean
  isBest: boolean
  quoteData: ApiQuote
  bestBuyAmountBeforeFeesCryptoBaseUnit: string
  isLoading: boolean
}

const borderRadius = { base: 'md', md: 'lg' }
const hoverProps = {
  cursor: 'pointer',
  bg: 'background.surface.hover',
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
  const borderColor = useColorModeValue('blackAlpha.100', 'whiteAlpha.100')
  const redColor = useColorModeValue('red.500', 'red.200')
  const focusColor = useColorModeValue('blackAlpha.400', 'whiteAlpha.400')
  const { isOpen, onToggle } = useDisclosure({
    defaultIsOpen: errors.length === 0,
  })

  const {
    number: { toPercent },
  } = useLocaleFormatter()

  const { isTradingActive } = useIsTradingActive()

  const buyAsset = useAppSelector(selectBuyAsset)
  const sellAsset = useAppSelector(selectSellAsset)
  const userSlippagePercentageDecimal = useAppSelector(selectUserSlippagePercentageDecimal)

  const buyAssetMarketData = useAppSelector(state =>
    selectMarketDataById(state, buyAsset.assetId ?? ''),
  )

  const sellAmountCryptoPrecision = useAppSelector(selectSellAmountCryptoPrecision)

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
    dispatch(tradeQuoteSlice.actions.setActiveQuoteIndex(quoteData.index))
  }, [dispatch, quoteData.index])

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

  const activeSwapperColor = (() => {
    if (!isTradingActive) return redColor
    if (!hasAmountWithPositiveReceive) return redColor
    if (isActive) return 'border.focused'
    return borderColor
  })()

  const activeProps = useMemo(
    () => ({ borderColor: isActive ? 'transparent' : focusColor }),
    [focusColor, isActive],
  )

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

  return showSwapper ? (
    <>
      <Card
        borderWidth={2}
        boxShadow='none'
        bg={isActive ? 'background.surface.hover' : 'transparent'}
        cursor={isDisabled ? 'not-allowed' : 'pointer'}
        borderColor={isActive ? activeSwapperColor : 'border.base'}
        _hover={isDisabled ? undefined : hoverProps}
        _active={isDisabled ? undefined : activeProps}
        borderRadius={borderRadius}
        size='sm'
        flexDir='column'
        width='full'
        fontSize='sm'
        onClick={isDisabled ? undefined : handleQuoteSelection}
        transitionProperty='common'
        transitionDuration='normal'
      >
        <CardHeader fontWeight='normal' fontSize='sm' pl={3} pr={4}>
          <Flex justifyContent='space-between' alignItems='center'>
            <Flex gap={2} alignItems='center'>
              <SwapperIcon swapperName={quoteData.swapperName} />
              <RawText fontWeight='medium'>
                {quote?.steps[0].source ?? quoteData.swapperName}
              </RawText>
            </Flex>
            <Flex gap={2}>
              <Skeleton isLoaded={!isLoading}>{tag}</Skeleton>
              {isDisabled && quote && <TwirlyToggle isOpen={isOpen} onToggle={onToggle} />}
            </Flex>
          </Flex>
        </CardHeader>

        {quote && (
          <Collapse in={isOpen}>
            <CardBody
              py={2}
              px={4}
              display='flex'
              alignItems='center'
              justifyContent='space-between'
            >
              <Flex gap={2} flexDir='column' justifyContent='space-between' alignItems='flex-start'>
                <Flex gap={2} alignItems='center'>
                  <Skeleton isLoaded={!isLoading}>
                    <Amount.Crypto
                      value={hasAmountWithPositiveReceive ? totalReceiveAmountCryptoPrecision : '0'}
                      symbol={buyAsset?.symbol ?? ''}
                      fontSize='xl'
                      lineHeight={1}
                    />
                  </Skeleton>
                  {!isBest &&
                    hasAmountWithPositiveReceive &&
                    quoteDifferenceDecimalPercentage !== 0 && (
                      <Skeleton isLoaded={!isLoading}>
                        <Amount.Percent
                          value={-quoteDifferenceDecimalPercentage}
                          prefix='('
                          suffix=')'
                          autoColor
                        />
                      </Skeleton>
                    )}
                </Flex>
                <Skeleton isLoaded={!isLoading}>
                  <Amount.Fiat
                    color='text.subtle'
                    value={totalReceiveAmountFiatPrecision}
                    prefix='≈'
                    lineHeight={1}
                  />
                </Skeleton>
              </Flex>
            </CardBody>

            <CardFooter px={4} pb={4}>
              <Flex justifyContent='left' alignItems='left' gap={8}>
                <Skeleton isLoaded={!isLoading}>
                  <Flex gap={2} alignItems='center'>
                    <RawText color='text.subtle'>
                      <FaGasPump />
                    </RawText>

                    {
                      // We cannot infer gas fees in specific scenarios, so if the fee is undefined we must render is as such
                      !networkFeeUserCurrencyPrecision ? (
                        translate('trade.unknownGas')
                      ) : (
                        <Amount.Fiat value={networkFeeUserCurrencyPrecision} />
                      )
                    }
                  </Flex>
                </Skeleton>
                {slippage}
                {totalEstimatedExecutionTimeMs !== undefined &&
                  totalEstimatedExecutionTimeMs > 0 && (
                    <Skeleton isLoaded={!isLoading}>
                      <Flex gap={2} alignItems='center'>
                        <RawText color='text.subtle'>
                          <FaRegClock />
                        </RawText>
                        {prettyMilliseconds(totalEstimatedExecutionTimeMs)}
                      </Flex>
                    </Skeleton>
                  )}
                <Skeleton isLoaded={!isLoading}>
                  {quote?.steps.length > 1 && (
                    <Tooltip label={translate('trade.numHops', { numHops: quote?.steps.length })}>
                      <Flex gap={2} alignItems='center'>
                        <RawText color='text.subtle'>
                          <BsLayers />
                        </RawText>
                        {quote?.steps.length ?? ''}
                      </Flex>
                    </Tooltip>
                  )}
                </Skeleton>
              </Flex>
            </CardFooter>
          </Collapse>
        )}
      </Card>
    </>
  ) : null
}

export const TradeQuote: FC<TradeQuoteProps> = props => <TradeQuoteLoaded {...props} />
