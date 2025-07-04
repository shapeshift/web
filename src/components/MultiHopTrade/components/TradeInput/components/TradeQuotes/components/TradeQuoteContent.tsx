import { WarningIcon } from '@chakra-ui/icons'
import { CardBody, CardFooter, Flex, Skeleton, Text as CText, Tooltip } from '@chakra-ui/react'
import type { TradeQuote, TradeRate } from '@shapeshiftoss/swapper'
import type { Asset } from '@shapeshiftoss/types'
import { bn } from '@shapeshiftoss/utils'
import prettyMilliseconds from 'pretty-ms'
import { useMemo } from 'react'
import { TbBolt, TbClockHour3, TbGasStation, TbRipple } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'

import { TradeQuoteMetaItem } from './TradeQuoteMetaItem'

import { Amount } from '@/components/Amount/Amount'
import { usePriceImpact } from '@/components/MultiHopTrade/hooks/quoteValidation/usePriceImpact'
import { Text } from '@/components/Text'
import { useLocaleFormatter } from '@/hooks/useLocaleFormatter/useLocaleFormatter'
import { QuoteDisplayOption } from '@/state/slices/preferencesSlice/preferencesSlice'

export type TradeQuoteContentProps = {
  isLoading: boolean
  buyAsset: Asset
  quoteDisplayOption: QuoteDisplayOption
  totalReceiveAmountFiatUserCurrency: string | undefined
  hasAmountWithPositiveReceive: boolean
  sellAmountUserCurrency: string | undefined
  totalReceiveAmountCryptoPrecision: string
  networkFeeFiatUserCurrency: string | undefined
  totalEstimatedExecutionTimeMs: number | undefined
  userSlippagePercentageDecimal: string | undefined
  tradeQuote: TradeQuote | TradeRate | undefined
}

export const TradeQuoteContent = ({
  isLoading,
  buyAsset,
  quoteDisplayOption,
  totalReceiveAmountFiatUserCurrency,
  hasAmountWithPositiveReceive,
  sellAmountUserCurrency,
  totalReceiveAmountCryptoPrecision,
  networkFeeFiatUserCurrency,
  totalEstimatedExecutionTimeMs,
  userSlippagePercentageDecimal,
  tradeQuote,
}: TradeQuoteContentProps) => {
  const translate = useTranslate()
  const {
    number: { toPercent },
  } = useLocaleFormatter()

  const { priceImpactColor, priceImpactPercentageAbsolute } = usePriceImpact(tradeQuote)

  const priceImpactDecimalPercentage = useMemo(
    () => priceImpactPercentageAbsolute?.div(100),
    [priceImpactPercentageAbsolute],
  )

  const priceImpactTooltipText = useMemo(
    () => translate('trade.tooltip.inputOutputDifference'),
    [translate],
  )

  const lossAfterRateAndFeesUserCurrency = useMemo(
    () =>
      priceImpactDecimalPercentage !== undefined && sellAmountUserCurrency !== undefined
        ? bn(sellAmountUserCurrency)
            .multipliedBy(priceImpactDecimalPercentage)
            .times(-1)
            .toFixed(2)
            .toString()
        : undefined,
    [priceImpactDecimalPercentage, sellAmountUserCurrency],
  )

  const maybeSlippageElement = useMemo(() => {
    if (!tradeQuote || quoteDisplayOption !== QuoteDisplayOption.Advanced) return

    // user slippage setting was not applied if:
    // - the user did not input a custom value
    // - the slippage on the quote is different to the custom value
    const isUserSlippageNotApplied =
      userSlippagePercentageDecimal !== undefined &&
      tradeQuote.slippageTolerancePercentageDecimal !== userSlippagePercentageDecimal

    if (!isUserSlippageNotApplied && tradeQuote.slippageTolerancePercentageDecimal === undefined)
      return

    const tooltip = (() => {
      if (isUserSlippageNotApplied) {
        return translate('trade.quote.cantSetSlippage', {
          userSlippageFormatted: toPercent(userSlippagePercentageDecimal),
          swapperName: tradeQuote.swapperName,
        })
      }

      return translate('trade.quote.slippage')
    })()

    const slippageElement = (() => {
      const autoSlippagePercentage =
        tradeQuote.isStreaming && isUserSlippageNotApplied
          ? translate('trade.slippage.auto')
          : undefined
      const userSlippagePercentage =
        tradeQuote.slippageTolerancePercentageDecimal !== undefined
          ? toPercent(tradeQuote.slippageTolerancePercentageDecimal)
          : undefined

      const slippagePercentageOrAuto = autoSlippagePercentage ?? userSlippagePercentage

      if (!slippagePercentageOrAuto) return null

      return (
        <CText color={isUserSlippageNotApplied ? 'text.error' : undefined}>
          {slippagePercentageOrAuto}
        </CText>
      )
    })()

    return (
      <TradeQuoteMetaItem
        tooltip={tooltip}
        icon={TbRipple}
        isLoading={isLoading}
        error={isUserSlippageNotApplied}
      >
        <Flex alignItems='center' gap={1.5}>
          {slippageElement}
          {isUserSlippageNotApplied && <WarningIcon color='text.error' />}
        </Flex>
      </TradeQuoteMetaItem>
    )
  }, [
    isLoading,
    tradeQuote,
    quoteDisplayOption,
    toPercent,
    translate,
    userSlippagePercentageDecimal,
  ])

  const maybeEtaElement = useMemo(() => {
    if (totalEstimatedExecutionTimeMs === undefined) return

    return (
      <TradeQuoteMetaItem
        icon={TbClockHour3}
        isLoading={isLoading}
        tooltip={translate('trade.quote.timeEstimate')}
      >
        {totalEstimatedExecutionTimeMs === 0
          ? '0s'
          : prettyMilliseconds(totalEstimatedExecutionTimeMs)}
      </TradeQuoteMetaItem>
    )
  }, [totalEstimatedExecutionTimeMs, isLoading, translate])

  const maybePriceImpactElement = useMemo(() => {
    return (
      priceImpactDecimalPercentage !== undefined &&
      quoteDisplayOption === QuoteDisplayOption.Advanced && (
        <TradeQuoteMetaItem icon={TbBolt} isLoading={isLoading} tooltip={priceImpactTooltipText}>
          <Amount.Percent
            value={priceImpactDecimalPercentage.times(-1).toString()}
            color={priceImpactColor}
          />
        </TradeQuoteMetaItem>
      )
    )
  }, [
    priceImpactDecimalPercentage,
    quoteDisplayOption,
    isLoading,
    priceImpactTooltipText,
    priceImpactColor,
  ])

  return (
    <>
      <CardBody py={2} px={4} display='flex' alignItems='center' justifyContent='space-between'>
        <Flex flexDir='column' justifyContent='space-between' alignItems='flex-start'>
          <Skeleton isLoaded={!isLoading}>
            <Amount.Crypto
              value={hasAmountWithPositiveReceive ? totalReceiveAmountCryptoPrecision : '0'}
              symbol={buyAsset.symbol}
              fontSize='2xl'
              fontWeight='medium'
            />
          </Skeleton>
          <Skeleton isLoaded={!isLoading}>
            {totalReceiveAmountFiatUserCurrency ? (
              <Flex gap={1}>
                <Amount.Fiat
                  color='text.subtle'
                  value={totalReceiveAmountFiatUserCurrency}
                  prefix='≈'
                  lineHeight={1}
                />
                <Tooltip label={translate('trade.tooltip.inputOutputDifference')}>
                  <Amount.Fiat
                    color='text.subtle'
                    value={lossAfterRateAndFeesUserCurrency}
                    prefix='('
                    suffix=')'
                    lineHeight={1}
                  />
                </Tooltip>
              </Flex>
            ) : null}
          </Skeleton>
        </Flex>
      </CardBody>

      <CardFooter px={4} py={4}>
        <Flex justifyContent='left' alignItems='left' gap={4}>
          <TradeQuoteMetaItem
            icon={TbGasStation}
            isLoading={isLoading}
            tooltip={
              !networkFeeFiatUserCurrency
                ? translate('trade.tooltip.continueSwapping')
                : translate('trade.quote.gas')
            }
          >
            {
              // We cannot infer gas fees in specific scenarios, so if the fee is undefined we must render is as such
              networkFeeFiatUserCurrency ? (
                <Amount.Fiat value={networkFeeFiatUserCurrency} />
              ) : (
                <Text translation={'trade.unknownGas'} fontSize='sm' />
              )
            }
          </TradeQuoteMetaItem>
          {maybePriceImpactElement}
          {maybeSlippageElement}
          {maybeEtaElement}
        </Flex>
      </CardFooter>
    </>
  )
}
