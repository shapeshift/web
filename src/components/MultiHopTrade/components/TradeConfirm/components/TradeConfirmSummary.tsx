import { ExternalLinkIcon } from '@chakra-ui/icons'
import { Divider, HStack, Icon, Link, Stack, Tooltip, useMediaQuery } from '@chakra-ui/react'
import { getHopByIndex } from '@shapeshiftoss/swapper'
import { fromBaseUnit } from '@shapeshiftoss/utils'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { PriceImpact } from '../../PriceImpact'
import { RateGasRow } from '../../RateGasRow'
import { MaxSlippage } from '../../TradeInput/components/MaxSlippage'
import { useIsApprovalInitiallyNeeded } from '../hooks/useIsApprovalInitiallyNeeded'

import { Amount } from '@/components/Amount/Amount'
import { parseAmountDisplayMeta } from '@/components/MultiHopTrade/helpers'
import { usePriceImpact } from '@/components/MultiHopTrade/hooks/quoteValidation/usePriceImpact'
import { Row } from '@/components/Row/Row'
import { RawText, Text } from '@/components/Text'
import { middleEllipsis } from '@/lib/utils'
import { selectFeeAssetById } from '@/state/slices/selectors'
import {
  selectInputBuyAsset,
  selectInputSellAsset,
  selectIsActiveQuoteMultiHop,
} from '@/state/slices/tradeInputSlice/selectors'
import {
  selectActiveQuote,
  selectActiveQuoteAffiliateBps,
  selectBuyAmountAfterFeesCryptoPrecision,
  selectFirstHop,
  selectFirstHopNetworkFeeCryptoBaseUnit,
  selectFirstHopNetworkFeeUserCurrency,
  selectSecondHopNetworkFeeCryptoBaseUnit,
  selectSecondHopNetworkFeeUserCurrency,
  selectTotalNetworkFeeUserCurrency,
  selectTradeSlippagePercentageDecimal,
} from '@/state/slices/tradeQuoteSlice/selectors'
import { useAppSelector, useSelectorWithArgs } from '@/state/store'
import { breakpoints } from '@/theme/theme'

export const TradeConfirmSummary = ({ isCompact }: { isCompact: boolean | undefined }) => {
  const affiliateBps = useAppSelector(selectActiveQuoteAffiliateBps)
  const activeQuote = useAppSelector(selectActiveQuote)
  const buyAsset = useAppSelector(selectInputBuyAsset)
  const sellAsset = useAppSelector(selectInputSellAsset)
  const totalNetworkFeeFiatPrecision = useAppSelector(selectTotalNetworkFeeUserCurrency)
  const buyAmountAfterFeesCryptoPrecision = useAppSelector(selectBuyAmountAfterFeesCryptoPrecision)
  const slippagePercentageDecimal = useAppSelector(selectTradeSlippagePercentageDecimal)
  const firstHopFeeAsset = useSelectorWithArgs(selectFeeAssetById, sellAsset.assetId)
  const secondHop = getHopByIndex(activeQuote, 1)
  const secondHopFeeAsset = useSelectorWithArgs(
    selectFeeAssetById,
    secondHop?.sellAsset.assetId ?? '',
  )
  const isMultiHopTrade = useAppSelector(selectIsActiveQuoteMultiHop)
  const firstHopNetworkFeeUserCurrency = useAppSelector(selectFirstHopNetworkFeeUserCurrency)
  const secondHopNetworkFeeUserCurrency = useAppSelector(selectSecondHopNetworkFeeUserCurrency)
  const firstHopNetworkFeeCryptoBaseUnit = useAppSelector(selectFirstHopNetworkFeeCryptoBaseUnit)
  const secondHopNetworkFeeCryptoBaseUnit = useAppSelector(selectSecondHopNetworkFeeCryptoBaseUnit)
  const tradeQuoteFirstHop = useAppSelector(selectFirstHop)
  const translate = useTranslate()
  const { priceImpactPercentage } = usePriceImpact(activeQuote)
  const { isLoading } = useIsApprovalInitiallyNeeded()
  const receiveAddress = activeQuote?.receiveAddress
  const rate = tradeQuoteFirstHop?.rate
  const intermediaryTransactionOutputs = tradeQuoteFirstHop?.intermediaryTransactionOutputs
  const intermediaryTransactionOutputsParsed = intermediaryTransactionOutputs
    ? parseAmountDisplayMeta(intermediaryTransactionOutputs)
    : undefined
  const hasIntermediaryTransactionOutputs =
    intermediaryTransactionOutputsParsed && intermediaryTransactionOutputsParsed.length > 0

  const firstHopNetworkFeeCryptoPrecision = useMemo(() => {
    if (!firstHopNetworkFeeCryptoBaseUnit) return undefined
    return fromBaseUnit(firstHopNetworkFeeCryptoBaseUnit, firstHopFeeAsset?.precision ?? 0)
  }, [firstHopNetworkFeeCryptoBaseUnit, firstHopFeeAsset?.precision])

  const secondHopNetworkFeeCryptoPrecision = useMemo(() => {
    if (!secondHopNetworkFeeCryptoBaseUnit) return undefined
    return fromBaseUnit(secondHopNetworkFeeCryptoBaseUnit, firstHopFeeAsset?.precision ?? 0)
  }, [secondHopNetworkFeeCryptoBaseUnit, firstHopFeeAsset?.precision])

  const [isSmallerThanXl] = useMediaQuery(`(max-width: ${breakpoints.xl})`, { ssr: false })

  return (
    <RateGasRow
      affiliateBps={affiliateBps}
      buyAssetSymbol={buyAsset.symbol}
      sellAssetSymbol={sellAsset.symbol}
      isDisabled={Boolean(isSmallerThanXl || isCompact)}
      rate={rate}
      isLoading={isLoading}
      networkFeeFiatUserCurrency={totalNetworkFeeFiatPrecision}
      swapperName={activeQuote?.swapperName}
      swapSource={tradeQuoteFirstHop?.source}
    >
      <Stack spacing={4} px={6} pb={3} width='full'>
        <Row>
          <Row.Label>
            <Text translation='trade.networkFee' />
          </Row.Label>
          <Row.Value>
            {
              // We cannot infer gas fees in specific scenarios, so if the fee is undefined we must render is as such
              !firstHopNetworkFeeUserCurrency ||
              (isMultiHopTrade && !secondHopNetworkFeeUserCurrency) ? (
                <Tooltip label={translate('trade.tooltip.continueSwapping')}>
                  <Text translation={'trade.unknownGas'} />
                </Tooltip>
              ) : (
                <>
                  {firstHopNetworkFeeUserCurrency &&
                    firstHopNetworkFeeCryptoPrecision &&
                    firstHopFeeAsset && (
                      <HStack justifyContent='flex-end'>
                        <Amount.Crypto
                          symbol={firstHopFeeAsset.symbol}
                          value={firstHopNetworkFeeCryptoPrecision}
                        />
                        <Amount.Fiat
                          color={'text.subtle'}
                          prefix='('
                          suffix=')'
                          noSpace
                          value={firstHopNetworkFeeUserCurrency}
                        />
                      </HStack>
                    )}
                  {secondHopNetworkFeeUserCurrency &&
                    secondHopNetworkFeeCryptoPrecision &&
                    secondHopFeeAsset && (
                      <HStack justifyContent='flex-end'>
                        <Amount.Crypto
                          symbol={secondHopFeeAsset.symbol}
                          value={secondHopNetworkFeeCryptoPrecision}
                        />
                        <Amount.Fiat
                          color={'text.subtle'}
                          prefix='('
                          suffix=')'
                          noSpace
                          value={secondHopNetworkFeeUserCurrency}
                        />
                      </HStack>
                    )}
                </>
              )
            }
          </Row.Value>
        </Row>
        <MaxSlippage
          swapSource={tradeQuoteFirstHop?.source}
          isLoading={isLoading}
          symbol={buyAsset.symbol}
          amountCryptoPrecision={buyAmountAfterFeesCryptoPrecision ?? '0'}
          slippagePercentageDecimal={slippagePercentageDecimal}
          hasIntermediaryTransactionOutputs={hasIntermediaryTransactionOutputs}
          intermediaryTransactionOutputs={intermediaryTransactionOutputs}
        />
        {priceImpactPercentage && <PriceImpact priceImpactPercentage={priceImpactPercentage} />}
        <Divider />
        <Row>
          <Row.Label>
            <Text translation='trade.recipientAddress' />
          </Row.Label>
          <Row.Value>
            <HStack>
              <RawText>{middleEllipsis(receiveAddress ?? '')}</RawText>
              <Link
                href={`${sellAsset.explorerAddressLink}${receiveAddress}`}
                isExternal
                aria-label='View on block explorer'
              >
                <Icon as={ExternalLinkIcon} />
              </Link>
            </HStack>
          </Row.Value>
        </Row>
      </Stack>
    </RateGasRow>
  )
}
