import { CardBody, CardFooter, Flex, Skeleton } from '@chakra-ui/react'
import type { TradeQuote, TradeRate } from '@shapeshiftoss/swapper'
import type { Asset } from '@shapeshiftoss/types'
import { bn } from '@shapeshiftoss/utils'
import prettyMilliseconds from 'pretty-ms'
import type { JSX } from 'react'
import { useMemo } from 'react'
import { TbBolt, TbClockHour3, TbGasStation } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'

import { TradeQuoteMetaItem } from './TradeQuoteMetaItem'

import { Amount } from '@/components/Amount/Amount'
import { usePriceImpact } from '@/components/MultiHopTrade/hooks/quoteValidation/usePriceImpact'
import { Text } from '@/components/Text'
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
  slippage: JSX.Element | undefined
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
  slippage,
  tradeQuote,
}: TradeQuoteContentProps) => {
  const translate = useTranslate()
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
            .toFixed(2)
            .toString()
        : undefined,
    [priceImpactDecimalPercentage, sellAmountUserCurrency],
  )

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
                <Amount.Fiat
                  color='text.subtle'
                  value={lossAfterRateAndFeesUserCurrency}
                  prefix='('
                  suffix=')'
                  lineHeight={1}
                />
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
          {priceImpactDecimalPercentage !== undefined &&
            quoteDisplayOption === QuoteDisplayOption.Advanced && (
              <TradeQuoteMetaItem
                icon={TbBolt}
                isLoading={isLoading}
                tooltip={priceImpactTooltipText}
              >
                <Amount.Percent
                  value={priceImpactDecimalPercentage.times(-1).toString()}
                  color={priceImpactColor}
                />
              </TradeQuoteMetaItem>
            )}

          {slippage}
          {totalEstimatedExecutionTimeMs !== undefined && (
            <TradeQuoteMetaItem
              icon={TbClockHour3}
              isLoading={isLoading}
              tooltip={translate('trade.quote.timeEstimate')}
            >
              {totalEstimatedExecutionTimeMs === 0
                ? '0s'
                : prettyMilliseconds(totalEstimatedExecutionTimeMs)}
            </TradeQuoteMetaItem>
          )}
        </Flex>
      </CardFooter>
    </>
  )
}
