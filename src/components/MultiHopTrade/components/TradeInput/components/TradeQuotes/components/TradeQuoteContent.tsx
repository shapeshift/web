import { CardBody, CardFooter, Flex, Skeleton, Tooltip } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import prettyMilliseconds from 'pretty-ms'
import { BsLayers } from 'react-icons/bs'
import { FaGasPump, FaRegClock } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { RawText } from 'components/Text'

export type TradeQuoteContentProps = {
  isLoading: boolean
  buyAsset: Asset
  isBest: boolean
  numHops: number
  totalReceiveAmountFiatPrecision: string
  hasAmountWithPositiveReceive: boolean
  totalReceiveAmountCryptoPrecision: string
  quoteDifferenceDecimalPercentage: number
  networkFeeUserCurrencyPrecision: string | undefined
  totalEstimatedExecutionTimeMs: number | undefined
  slippage: JSX.Element | undefined
}

export const TradeQuoteContent = ({
  isLoading,
  buyAsset,
  isBest,
  numHops,
  totalReceiveAmountFiatPrecision,
  hasAmountWithPositiveReceive,
  totalReceiveAmountCryptoPrecision,
  quoteDifferenceDecimalPercentage,
  networkFeeUserCurrencyPrecision,
  totalEstimatedExecutionTimeMs,
  slippage,
}: TradeQuoteContentProps) => {
  const translate = useTranslate()

  return (
    <>
      <CardBody py={2} px={4} display='flex' alignItems='center' justifyContent='space-between'>
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
            {!isBest && hasAmountWithPositiveReceive && quoteDifferenceDecimalPercentage !== 0 && (
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
