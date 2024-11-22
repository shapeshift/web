import { ExternalLinkIcon } from '@chakra-ui/icons'
import { HStack, Icon, Stack, useColorModeValue } from '@chakra-ui/react'
import type { AmountDisplayMeta } from '@shapeshiftoss/swapper'
import { bnOrZero, fromBaseUnit, isSome } from '@shapeshiftoss/utils'
import { useCallback, useMemo } from 'react'
import { Amount } from 'components/Amount/Amount'
import { usePriceImpact } from 'components/MultiHopTrade/hooks/quoteValidation/usePriceImpact'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { selectInputBuyAsset } from 'state/slices/tradeInputSlice/selectors'
import {
  selectActiveQuote,
  selectActiveSwapperName,
  selectBuyAmountAfterFeesCryptoPrecision,
  selectFirstHop,
  selectTotalProtocolFeeByAsset,
  selectTradeSlippagePercentageDecimal,
} from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'

import { Footer as TradeFooterButton } from '../MultiHopTradeConfirm/components/Footer'
import { useIsApprovalInitiallyNeeded } from '../MultiHopTradeConfirm/hooks/useIsApprovalInitiallyNeeded'
import { PriceImpact } from '../PriceImpact'
import { SharedConfirm } from '../SharedConfirm/SharedConfirm'
import { MaxSlippage } from '../TradeInput/components/MaxSlippage'
import { SwapperIcon } from '../TradeInput/components/SwapperIcon/SwapperIcon'

const parseAmountDisplayMeta = (items: AmountDisplayMeta[]) => {
  return items
    .filter(({ amountCryptoBaseUnit }) => bnOrZero(amountCryptoBaseUnit).gt(0))
    .map(({ amountCryptoBaseUnit, asset }: AmountDisplayMeta) => ({
      symbol: asset.symbol,
      chainName: getChainAdapterManager().get(asset.chainId)?.getDisplayName(),
      amountCryptoPrecision: fromBaseUnit(amountCryptoBaseUnit, asset.precision),
    }))
}

const ProtocolFeeToolTip = () => {
  return <Text color='text.subtle' translation={'trade.tooltip.protocolFee'} />
}

export const TradeConfirm = () => {
  const swapperName = useAppSelector(selectActiveSwapperName)
  const activeQuote = useAppSelector(selectActiveQuote)
  const tradeQuoteStep = useAppSelector(selectFirstHop)
  const buyAsset = useAppSelector(selectInputBuyAsset)
  const buyAmountAfterFeesCryptoPrecision = useAppSelector(selectBuyAmountAfterFeesCryptoPrecision)
  const slippagePercentageDecimal = useAppSelector(selectTradeSlippagePercentageDecimal)
  const totalProtocolFees = useAppSelector(selectTotalProtocolFeeByAsset)

  const { priceImpactPercentage } = usePriceImpact(activeQuote)
  const { isLoading } = useIsApprovalInitiallyNeeded()
  const redColor = useColorModeValue('red.500', 'red.300')

  const swapSource = tradeQuoteStep?.source
  const intermediaryTransactionOutputs = tradeQuoteStep?.intermediaryTransactionOutputs
  const intermediaryTransactionOutputsParsed = intermediaryTransactionOutputs
    ? parseAmountDisplayMeta(intermediaryTransactionOutputs)
    : undefined
  const hasIntermediaryTransactionOutputs =
    intermediaryTransactionOutputsParsed && intermediaryTransactionOutputsParsed.length > 0
  const protocolFeesParsed = totalProtocolFees
    ? parseAmountDisplayMeta(Object.values(totalProtocolFees).filter(isSome))
    : undefined
  const hasProtocolFees = protocolFeesParsed && protocolFeesParsed.length > 0

  const handleSubmit = useCallback(() => {
    console.log('submit')
  }, [])

  const TradeDetailTable = useMemo(() => {
    if (!activeQuote) return null

    return (
      <Stack spacing={4} width='full'>
        <Row>
          <Row.Label>
            <Text translation='trade.protocol' />
          </Row.Label>
          <Row.Value>
            <HStack>
              {swapperName !== undefined && <SwapperIcon size='2xs' swapperName={swapperName} />}
              {swapSource !== undefined && <RawText>{swapSource}</RawText>}
            </HStack>
          </Row.Value>
        </Row>

        <Row>
          <Row.Label>
            <Text translation='trade.transactionFee' />
          </Row.Label>
          <Row.Value>
            <RawText>$0.00258</RawText>
          </Row.Value>
        </Row>

        {hasProtocolFees && (
          <Row Tooltipbody={ProtocolFeeToolTip} isLoading={isLoading}>
            <Row.Label>
              <Text translation='trade.protocolFee' />
            </Row.Label>
            <Row.Value color='text.base'>
              {protocolFeesParsed?.map(({ amountCryptoPrecision, symbol }) => (
                <Amount.Crypto
                  key={`${amountCryptoPrecision}`}
                  color={redColor}
                  value={amountCryptoPrecision}
                  symbol={symbol}
                />
              ))}
            </Row.Value>
          </Row>
        )}

        <Row>
          <Row.Label>
            <Text translation='trade.shapeShiftFee' />
          </Row.Label>
          <Row.Value>
            <HStack>
              <RawText>Free</RawText>
              <RawText color='text.subtle'>(0 bps)</RawText>
            </HStack>
          </Row.Value>
        </Row>

        <Row>
          <Row.Label>
            <Text translation='trade.recipientAddress' />
          </Row.Label>
          <Row.Value>
            <HStack>
              <RawText>0xe5...971d</RawText>
              <Icon as={ExternalLinkIcon} />
            </HStack>
          </Row.Value>
        </Row>

        {/* TODO: Hide the below unless expanded */}

        <Row>
          <Row.Label>
            <Text translation='trade.rate' />
          </Row.Label>
          <Row.Value>
            <RawText>1 METH = 0.0 ETH</RawText>
          </Row.Value>
        </Row>

        <MaxSlippage
          swapSource={tradeQuoteStep?.source}
          isLoading={isLoading}
          symbol={buyAsset.symbol}
          amountCryptoPrecision={buyAmountAfterFeesCryptoPrecision ?? '0'}
          slippagePercentageDecimal={slippagePercentageDecimal}
          hasIntermediaryTransactionOutputs={hasIntermediaryTransactionOutputs}
          intermediaryTransactionOutputs={intermediaryTransactionOutputs}
        />

        {priceImpactPercentage && <PriceImpact priceImpactPercentage={priceImpactPercentage} />}
      </Stack>
    )
  }, [
    activeQuote,
    buyAmountAfterFeesCryptoPrecision,
    buyAsset.symbol,
    hasIntermediaryTransactionOutputs,
    hasProtocolFees,
    intermediaryTransactionOutputs,
    isLoading,
    priceImpactPercentage,
    protocolFeesParsed,
    redColor,
    slippagePercentageDecimal,
    swapSource,
    swapperName,
    tradeQuoteStep?.source,
  ])

  const FooterButton = useMemo(() => {
    return <TradeFooterButton isLoading={isLoading} handleSubmit={handleSubmit} />
  }, [isLoading, handleSubmit])

  return (
    <SharedConfirm
      ConfirmDetailTable={TradeDetailTable}
      FooterButton={FooterButton}
      isLoading={isLoading}
    />
  )
}
