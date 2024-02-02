import { Divider, Flex, Skeleton, Stack } from '@chakra-ui/react'
import { Tag } from '@chakra-ui/tag'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import type { AmountDisplayMeta, SwapSource } from '@shapeshiftoss/swapper'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { Row } from 'components/Row/Row'
import { Text } from 'components/Text'
import type { TextPropTypes } from 'components/Text/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { fromBaseUnit } from 'lib/math'
import {
  THORCHAIN_LONGTAIL_STREAMING_SWAP_SOURCE,
  THORCHAIN_STREAM_SWAP_SOURCE,
} from 'lib/swapper/swappers/ThorchainSwapper/constants'
import {
  convertDecimalPercentageToBasisPoints,
  subtractBasisPointAmount,
} from 'state/slices/tradeQuoteSlice/utils'

type MaxSlippageProps = {
  swapSource?: SwapSource
  isLoading?: boolean
  amountCryptoPrecision: string
  slippageDecimalPercentage: string
  hasIntermediaryTransactionOutputs?: boolean
  intermediaryTransactionOutputs?: AmountDisplayMeta[]
  symbol: string
}

export const MaxSlippage: React.FC<MaxSlippageProps> = ({
  swapSource,
  isLoading,
  amountCryptoPrecision,
  slippageDecimalPercentage,
  hasIntermediaryTransactionOutputs,
  intermediaryTransactionOutputs,
  symbol,
}) => {
  const translate = useTranslate()
  const shouldShowSlippageMinAmount = useMemo(
    () =>
      swapSource !== THORCHAIN_STREAM_SWAP_SOURCE &&
      swapSource !== THORCHAIN_LONGTAIL_STREAMING_SWAP_SOURCE,
    [swapSource],
  )
  const slippageAsPercentageString = bnOrZero(slippageDecimalPercentage).times(100).toString()
  const isAmountPositive = bnOrZero(amountCryptoPrecision).gt(0)

  const minAmountAfterSlippageTranslation: TextPropTypes['translation'] = useMemo(
    () => ['trade.tooltip.slippageMin', { amount: '100', symbol }],
    [symbol],
  )

  const amountAfterSlippage = useMemo(() => {
    const slippageBps = convertDecimalPercentageToBasisPoints(slippageDecimalPercentage)
    return isAmountPositive ? subtractBasisPointAmount(amountCryptoPrecision, slippageBps) : '0'
  }, [amountCryptoPrecision, isAmountPositive, slippageDecimalPercentage])

  const parseAmountDisplayMeta = useCallback((items: AmountDisplayMeta[]) => {
    return items
      .filter(({ amountCryptoBaseUnit }) => bnOrZero(amountCryptoBaseUnit).gt(0))
      .map(({ amountCryptoBaseUnit, asset }: AmountDisplayMeta) => ({
        symbol: asset.symbol,
        chainName: getChainAdapterManager().get(asset.chainId)?.getDisplayName(),
        amountCryptoPrecision: fromBaseUnit(amountCryptoBaseUnit, asset.precision),
      }))
  }, [])

  const intermediaryTransactionOutputsParsed = useMemo(
    () =>
      intermediaryTransactionOutputs
        ? parseAmountDisplayMeta(intermediaryTransactionOutputs)
        : undefined,
    [intermediaryTransactionOutputs, parseAmountDisplayMeta],
  )

  const divider = useMemo(() => <Divider borderColor='border.base' />, [])

  const tooltipBody = useCallback(() => {
    if (!shouldShowSlippageMinAmount)
      return <Text color='text.subtle' translation='trade.slippageInfo' />
    return (
      <Stack divider={divider}>
        <Row gap={4}>
          <Row.Label>
            <Text translation='trade.receiveAtLeast' />
          </Row.Label>
          <Row.Value whiteSpace='nowrap' color='text.base'>
            <Stack spacing={0} alignItems='flex-end'>
              <Skeleton isLoaded={!isLoading}>
                <Amount.Crypto
                  value={amountAfterSlippage}
                  symbol={symbol}
                  maximumFractionDigits={4}
                />
              </Skeleton>
              {isAmountPositive &&
                hasIntermediaryTransactionOutputs &&
                intermediaryTransactionOutputsParsed?.map(
                  ({ amountCryptoPrecision, symbol, chainName }) => (
                    <Skeleton isLoaded={!isLoading} key={`${symbol}_${chainName}`}>
                      <Amount.Crypto
                        value={amountCryptoPrecision}
                        symbol={symbol}
                        prefix={translate('trade.or')}
                        maximumFractionDigits={4}
                        suffix={
                          chainName
                            ? translate('trade.onChainName', {
                                chainName,
                              })
                            : undefined
                        }
                      />
                    </Skeleton>
                  ),
                )}
            </Stack>
          </Row.Value>
        </Row>
        <Text color='text.subtle' fontSize='xs' translation={minAmountAfterSlippageTranslation} />
      </Stack>
    )
  }, [
    amountAfterSlippage,
    divider,
    hasIntermediaryTransactionOutputs,
    intermediaryTransactionOutputsParsed,
    isAmountPositive,
    isLoading,
    minAmountAfterSlippageTranslation,
    shouldShowSlippageMinAmount,
    symbol,
    translate,
  ])

  return (
    <Row Tooltipbody={tooltipBody}>
      <Row.Label>{translate('trade.slippage.maxSlippage')}</Row.Label>
      <Row.Value>
        <Flex alignItems='center' gap={2}>
          <Tag size='sm' colorScheme='blue'>
            Auto
          </Tag>
          <Amount.Percent value={bnOrZero(slippageAsPercentageString).div(100).toString()} />
        </Flex>
      </Row.Value>
    </Row>
  )
}
