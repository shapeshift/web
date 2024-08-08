import { Box, CardBody, CardFooter, Flex, Skeleton, Tooltip } from '@chakra-ui/react'
import type { TradeQuote } from '@shapeshiftoss/swapper'
import type { Asset } from '@shapeshiftoss/types'
import prettyMilliseconds from 'pretty-ms'
import { useMemo } from 'react'
import { BsLayers } from 'react-icons/bs'
import { FaGasPump, FaRegClock } from 'react-icons/fa'
import { MdOfflineBolt } from 'react-icons/md'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { usePriceImpact } from 'components/MultiHopTrade/hooks/quoteValidation/usePriceImpact'
import { RawText } from 'components/Text'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'

export type TradeQuoteContentProps = {
  isLoading: boolean
  buyAsset: Asset
  isBest: boolean
  numHops: number
  totalReceiveAmountFiatPrecision: string | undefined
  hasAmountWithPositiveReceive: boolean
  totalReceiveAmountCryptoPrecision: string
  quoteDifferenceDecimalPercentage: number | undefined
  networkFeeUserCurrencyPrecision: string | undefined
  totalEstimatedExecutionTimeMs: number | undefined
  slippage: JSX.Element | undefined
  tradeQuote: TradeQuote | undefined
}

export const TradeQuoteContent = ({
  isLoading,
  buyAsset,
  isBest,
  numHops,
  totalReceiveAmountFiatPrecision,
  hasAmountWithPositiveReceive,
  totalReceiveAmountCryptoPrecision,
  quoteDifferenceDecimalPercentage: maybeQuoteDifferenceDecimalPercentage,
  networkFeeUserCurrencyPrecision,
  totalEstimatedExecutionTimeMs,
  slippage,
  tradeQuote,
}: TradeQuoteContentProps) => {
  const translate = useTranslate()
  const { isModeratePriceImpact, isHighPriceImpact, priceImpactPercentage } =
    usePriceImpact(tradeQuote)

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
      default:
        return undefined
    }
  }, [isHighPriceImpact, isModeratePriceImpact])

  const priceImpactDecimalPercentage = useMemo(
    () => priceImpactPercentage?.div(100),
    [priceImpactPercentage],
  )

  const priceImpactTooltipText = useMemo(() => {
    if (!priceImpactPercentage) return

    const defaultText = translate('trade.tooltip.priceImpactLabel', {
      priceImpactPercentage: priceImpactPercentage.toFixed(2),
    })
    switch (true) {
      case isHighPriceImpact:
      case isModeratePriceImpact:
        return `${defaultText}. ${translate('trade.tooltip.priceImpact')}`
      default:
        return defaultText
    }
  }, [isHighPriceImpact, isModeratePriceImpact, priceImpactPercentage, translate])

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
            {totalReceiveAmountFiatPrecision ? (
              <Amount.Fiat
                color='text.subtle'
                value={totalReceiveAmountFiatPrecision}
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
                !networkFeeUserCurrencyPrecision ? (
                  translate('trade.unknownGas')
                ) : (
                  <Amount.Fiat value={networkFeeUserCurrencyPrecision} />
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
          {totalEstimatedExecutionTimeMs !== undefined && totalEstimatedExecutionTimeMs > 0 && (
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
