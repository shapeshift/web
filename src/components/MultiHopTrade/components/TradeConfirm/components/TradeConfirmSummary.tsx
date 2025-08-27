import { Divider, HStack, Stack, Tooltip } from '@chakra-ui/react'
import { getHopByIndex } from '@shapeshiftoss/swapper'
import { bnOrZero, fromBaseUnit } from '@shapeshiftoss/utils'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { PriceImpact } from '../../PriceImpact'
import { RateGasRow } from '../../RateGasRow'
import { MaxSlippage } from '../../TradeInput/components/MaxSlippage'
import { useIsApprovalInitiallyNeeded } from '../hooks/useIsApprovalInitiallyNeeded'

import { Amount } from '@/components/Amount/Amount'
import { ChangeAddressRow } from '@/components/ChangeAddressRow'
import { parseAmountDisplayMeta } from '@/components/MultiHopTrade/helpers'
import { usePriceImpact } from '@/components/MultiHopTrade/hooks/quoteValidation/usePriceImpact'
import { RecipientAddressRow } from '@/components/RecipientAddressRow'
import { Row } from '@/components/Row/Row'
import { RawText, Text } from '@/components/Text'
import { selectFeeAssetById } from '@/state/slices/selectors'
import { selectCurrentSwap } from '@/state/slices/swapSlice/selectors'
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

export const TradeConfirmSummary = () => {
  const affiliateBps = useAppSelector(selectActiveQuoteAffiliateBps)
  const activeQuote = useAppSelector(selectActiveQuote)
  const activeSwap = useAppSelector(selectCurrentSwap)
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
  const { priceImpactColor, priceImpactPercentage } = usePriceImpact(activeQuote)
  const { isLoading } = useIsApprovalInitiallyNeeded()
  const receiveAddress = activeQuote?.receiveAddress
  const rate = tradeQuoteFirstHop?.rate
  const intermediaryTransactionOutputs = tradeQuoteFirstHop?.intermediaryTransactionOutputs
  const intermediaryTransactionOutputsParsed = intermediaryTransactionOutputs
    ? parseAmountDisplayMeta(intermediaryTransactionOutputs)
    : undefined
  const hasIntermediaryTransactionOutputs =
    intermediaryTransactionOutputsParsed && intermediaryTransactionOutputsParsed.length > 0

  const utxoChangeAddress = activeSwap?.metadata?.utxoChangeAddress

  const firstHopNetworkFeeCryptoPrecision = useMemo(() => {
    if (!firstHopNetworkFeeCryptoBaseUnit) return undefined
    return fromBaseUnit(firstHopNetworkFeeCryptoBaseUnit, firstHopFeeAsset?.precision ?? 0)
  }, [firstHopNetworkFeeCryptoBaseUnit, firstHopFeeAsset?.precision])

  const secondHopNetworkFeeCryptoPrecision = useMemo(() => {
    if (!secondHopNetworkFeeCryptoBaseUnit) return undefined
    return fromBaseUnit(secondHopNetworkFeeCryptoBaseUnit, firstHopFeeAsset?.precision ?? 0)
  }, [secondHopNetworkFeeCryptoBaseUnit, firstHopFeeAsset?.precision])

  const networkFeeTooltipBody = useCallback(
    () => <RawText>{translate('trade.tooltip.minerFee')}</RawText>,
    [translate],
  )

  return (
    <RateGasRow
      affiliateBps={affiliateBps}
      buyAssetId={buyAsset.assetId}
      sellAssetId={sellAsset.assetId}
      rate={bnOrZero(rate).toFixed(buyAsset.precision)}
      isLoading={isLoading}
      networkFeeFiatUserCurrency={totalNetworkFeeFiatPrecision}
      swapperName={activeQuote?.swapperName}
      swapSource={tradeQuoteFirstHop?.source}
      isOpen
    >
      <Stack spacing={4} px={6} py={3} width='full'>
        <Row Tooltipbody={networkFeeTooltipBody}>
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
        <PriceImpact priceImpactPercentage={priceImpactPercentage} color={priceImpactColor} />
        <Divider />
        <RecipientAddressRow
          explorerAddressLink={buyAsset.explorerAddressLink}
          recipientAddress={receiveAddress ?? ''}
        />
        {utxoChangeAddress && (
          <ChangeAddressRow
            explorerAddressLink={sellAsset.explorerAddressLink}
            changeAddress={utxoChangeAddress}
          />
        )}
      </Stack>
    </RateGasRow>
  )
}
