import { Box, CardBody, CardFooter, Flex, Skeleton, Tooltip } from '@chakra-ui/react'
import type { TradeQuote, TradeRate } from '@shapeshiftoss/swapper'
import type { Asset } from '@shapeshiftoss/types'
import prettyMilliseconds from 'pretty-ms'
import type { JSX } from 'react'
import { useMemo } from 'react'
import { BsLayers } from 'react-icons/bs'
import { FaGasPump, FaRegClock } from 'react-icons/fa'
import { MdOfflineBolt } from 'react-icons/md'
import { useTranslate } from 'react-polyglot'

import { Amount } from '@/components/Amount/Amount'
import { usePriceImpact } from '@/components/MultiHopTrade/hooks/quoteValidation/usePriceImpact'
import { RawText, Text } from '@/components/Text'
import { useLocaleFormatter } from '@/hooks/useLocaleFormatter/useLocaleFormatter'

export type TradeQuoteContentProps = {
  isLoading: boolean
  buyAsset: Asset
  isBest: boolean
  numHops: number
  totalReceiveAmountFiatUserCurrency: string | undefined
  hasAmountWithPositiveReceive: boolean
  totalReceiveAmountCryptoPrecision: string
  quoteDifferenceDecimalPercentage: number | undefined
  networkFeeFiatUserCurrency: string | undefined
  totalEstimatedExecutionTimeMs: number | undefined
  slippage: JSX.Element | undefined
  tradeQuote: TradeQuote | TradeRate | undefined
}

export const TradeQuoteContent = ({
  isLoading,
  buyAsset,
  isBest,
  numHops,
  totalReceiveAmountFiatUserCurrency,
  hasAmountWithPositiveReceive,
  totalReceiveAmountCryptoPrecision,
  quoteDifferenceDecimalPercentage: maybeQuoteDifferenceDecimalPercentage,
  networkFeeFiatUserCurrency,
  totalEstimatedExecutionTimeMs,
  slippage,
  tradeQuote,
}: TradeQuoteContentProps) => {
  const translate = useTranslate()
  const {
    isModeratePriceImpact,
    isHighPriceImpact,
    priceImpactPercentageAbsolute,
    isPositivePriceImpact,
  } = usePriceImpact(tradeQuote)

  const {
    number: { toPercent },
  } = useLocaleFormatter()

  const quoteDifferenceDecimalPercentage = useMemo(() => {
    if (maybeQuoteDifferenceDecimalPercentage === undefined) return
    return -maybeQuoteDifferenceDecimalPercentage
  }, [maybeQuoteDifferenceDecimalPercentage])

  // don't render the percentage difference if the parsed value is 0.00%
  const shouldRenderPercentageDiff = useMemo(() => {
    if (quoteDifferenceDecimalPercentage === undefined) return false
    const formattedNumber = toPercent(quoteDifferenceDecimalPercentage)
    const parsedValue = parseFloat(formattedNumber)
    return parsedValue !== 0
  }, [quoteDifferenceDecimalPercentage, toPercent])

  const percentageDifferenceTooltipText = useMemo(() => {
    return translate('trade.tooltip.amountPercentageDifference', {
      buyAssetSymbol: buyAsset.symbol,
    })
  }, [buyAsset, translate])

  const priceImpactColor = useMemo(() => {
    switch (true) {
      case isHighPriceImpact:
        return 'text.error'
      case isModeratePriceImpact:
        return 'text.warning'
      case isPositivePriceImpact:
        return 'text.success'
      default:
        return undefined
    }
  }, [isHighPriceImpact, isModeratePriceImpact, isPositivePriceImpact])

  const priceImpactDecimalPercentage = useMemo(
    () => priceImpactPercentageAbsolute?.div(100),
    [priceImpactPercentageAbsolute],
  )

  const priceImpactTooltipText = useMemo(() => {
    if (!priceImpactPercentageAbsolute) return

    const defaultText = translate('trade.tooltip.priceImpactLabel', {
      priceImpactPercentage: priceImpactPercentageAbsolute.toFixed(2),
    })
    switch (true) {
      case isHighPriceImpact:
      case isModeratePriceImpact:
        return `${defaultText}. ${translate('trade.tooltip.priceImpact')}`
      default:
        return defaultText
    }
  }, [isHighPriceImpact, isModeratePriceImpact, priceImpactPercentageAbsolute, translate])

  const eta = useMemo(() => {
    if (totalEstimatedExecutionTimeMs === undefined) return null

    return (
      <Skeleton isLoaded={!isLoading}>
        <Flex gap={2} alignItems='center'>
          <RawText color='text.subtle'>
            <FaRegClock />
          </RawText>
          {totalEstimatedExecutionTimeMs === 0
            ? '0s'
            : prettyMilliseconds(totalEstimatedExecutionTimeMs)}
        </Flex>
      </Skeleton>
    )
  }, [totalEstimatedExecutionTimeMs, isLoading])

  return (
    <>
      <CardBody py={2} px={4} display='flex' alignItems='center' justifyContent='space-between'>
        <Flex gap={2} flexDir='column' justifyContent='space-between' alignItems='flex-start'>
          <Flex gap={2} alignItems='center'>
            <Skeleton isLoaded={!isLoading}>
              <Amount.Crypto
                value={hasAmountWithPositiveReceive ? totalReceiveAmountCryptoPrecision : '0'}
                symbol={buyAsset.symbol}
                fontSize='xl'
                lineHeight={1}
              />
            </Skeleton>
            {!isBest && hasAmountWithPositiveReceive && shouldRenderPercentageDiff && (
              <Skeleton isLoaded={!isLoading}>
                <Tooltip label={percentageDifferenceTooltipText}>
                  <Box>
                    <Amount.Percent
                      value={quoteDifferenceDecimalPercentage ?? 0}
                      prefix='('
                      suffix=')'
                      autoColor
                    />
                  </Box>
                </Tooltip>
              </Skeleton>
            )}
          </Flex>
          <Skeleton isLoaded={!isLoading}>
            {totalReceiveAmountFiatUserCurrency ? (
              <Amount.Fiat
                color='text.subtle'
                value={totalReceiveAmountFiatUserCurrency}
                prefix='≈'
                lineHeight={1}
              />
            ) : null}
          </Skeleton>
        </Flex>
      </CardBody>

      <CardFooter px={4} pb={4}>
        <Flex justifyContent='left' alignItems='left' gap={4}>
          <Skeleton isLoaded={!isLoading}>
            <Flex gap={2} alignItems='center'>
              <RawText color='text.subtle'>
                <FaGasPump />
              </RawText>
              {
                // We cannot infer gas fees in specific scenarios, so if the fee is undefined we must render is as such
                !networkFeeFiatUserCurrency ? (
                  <Tooltip label={translate('trade.tooltip.continueSwapping')}>
                    <Text translation={'trade.unknownGas'} fontSize='sm' />
                  </Tooltip>
                ) : (
                  <Amount.Fiat value={networkFeeFiatUserCurrency} />
                )
              }
            </Flex>
          </Skeleton>

          {priceImpactDecimalPercentage !== undefined && (
            <Skeleton isLoaded={!isLoading}>
              <Tooltip label={priceImpactTooltipText}>
                <Flex gap={2} alignItems='center'>
                  <RawText color='text.subtle'>
                    <MdOfflineBolt />
                  </RawText>
                  <Amount.Percent
                    value={priceImpactDecimalPercentage.toNumber()}
                    color={priceImpactColor}
                  />
                </Flex>
              </Tooltip>
            </Skeleton>
          )}

          {slippage}
          {eta}
          <Skeleton isLoaded={!isLoading}>
            {numHops > 1 && (
              <Tooltip label={translate('trade.numHops', { numHops })}>
                <Flex gap={2} alignItems='center'>
                  <RawText color='text.subtle'>
                    <BsLayers />
                  </RawText>
                  {numHops ?? ''}
                </Flex>
              </Tooltip>
            )}
          </Skeleton>
        </Flex>
      </CardFooter>
    </>
  )
}
