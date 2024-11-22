import { ExternalLinkIcon, QuestionIcon } from '@chakra-ui/icons'
import { Flex, HStack, Icon, Link, Stack, Tooltip, useColorModeValue } from '@chakra-ui/react'
import type { AmountDisplayMeta } from '@shapeshiftoss/swapper'
import { bnOrZero, fromBaseUnit, isSome } from '@shapeshiftoss/utils'
import { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { FeeModal } from 'components/FeeModal/FeeModal'
import { usePriceImpact } from 'components/MultiHopTrade/hooks/quoteValidation/usePriceImpact'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { THORSWAP_MAXIMUM_YEAR_TRESHOLD, THORSWAP_UNIT_THRESHOLD } from 'lib/fees/model'
import { middleEllipsis } from 'lib/utils'
import { selectThorVotingPower } from 'state/apis/snapshot/selectors'
import {
  selectInputBuyAsset,
  selectInputSellAmountUsd,
  selectInputSellAsset,
} from 'state/slices/tradeInputSlice/selectors'
import {
  selectActiveQuote,
  selectActiveSwapperName,
  selectBuyAmountAfterFeesCryptoPrecision,
  selectFirstHop,
  selectTotalNetworkFeeUserCurrencyPrecision,
  selectTotalProtocolFeeByAsset,
  selectTradeQuoteAffiliateFeeAfterDiscountUserCurrency,
  selectTradeSlippagePercentageDecimal,
} from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'

import { Footer as TradeFooterButton } from '../MultiHopTradeConfirm/components/Footer'
import { useIsApprovalInitiallyNeeded } from '../MultiHopTradeConfirm/hooks/useIsApprovalInitiallyNeeded'
import { PriceImpact } from '../PriceImpact'
import { SharedConfirm } from '../SharedConfirm/SharedConfirm'
import { MaxSlippage } from '../TradeInput/components/MaxSlippage'
import { SwapperIcon } from '../TradeInput/components/SwapperIcon/SwapperIcon'
import { useTradeReceiveAddress } from '../TradeInput/hooks/useTradeReceiveAddress'

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

const shapeShiftFeeModalRowHover = { textDecoration: 'underline', cursor: 'pointer' }

export const TradeConfirm = () => {
  const swapperName = useAppSelector(selectActiveSwapperName)
  const activeQuote = useAppSelector(selectActiveQuote)
  const tradeQuoteStep = useAppSelector(selectFirstHop)
  const buyAsset = useAppSelector(selectInputBuyAsset)
  const sellAsset = useAppSelector(selectInputSellAsset)
  const buyAmountAfterFeesCryptoPrecision = useAppSelector(selectBuyAmountAfterFeesCryptoPrecision)
  const slippagePercentageDecimal = useAppSelector(selectTradeSlippagePercentageDecimal)
  const totalProtocolFees = useAppSelector(selectTotalProtocolFeeByAsset)
  const sellAmountUsd = useAppSelector(selectInputSellAmountUsd)
  const affiliateFeeAfterDiscountUserCurrency = useAppSelector(
    selectTradeQuoteAffiliateFeeAfterDiscountUserCurrency,
  )
  const networkFeeFiatUserCurrency = useAppSelector(selectTotalNetworkFeeUserCurrencyPrecision)

  const translate = useTranslate()
  const { priceImpactPercentage } = usePriceImpact(activeQuote)
  const { isLoading } = useIsApprovalInitiallyNeeded()
  const redColor = useColorModeValue('red.500', 'red.300')
  const greenColor = useColorModeValue('green.600', 'green.200')
  const { manualReceiveAddress, walletReceiveAddress } = useTradeReceiveAddress()
  const [showFeeModal, setShowFeeModal] = useState(false)
  const thorVotingPower = useAppSelector(selectThorVotingPower)

  const receiveAddress = manualReceiveAddress ?? walletReceiveAddress
  const swapSource = tradeQuoteStep?.source
  const rate = tradeQuoteStep?.rate
  const sellAssetSymbol = sellAsset.symbol
  const buyAssetSymbol = buyAsset.symbol
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

  const isThorFreeTrade = useMemo(
    () =>
      bnOrZero(thorVotingPower).toNumber() >= THORSWAP_UNIT_THRESHOLD &&
      new Date().getUTCFullYear() < THORSWAP_MAXIMUM_YEAR_TRESHOLD,
    [thorVotingPower],
  )

  const toggleFeeModal = useCallback(() => {
    if (isThorFreeTrade) return

    setShowFeeModal(!showFeeModal)
  }, [showFeeModal, isThorFreeTrade])

  const TradeDetailTable = useMemo(() => {
    if (!activeQuote) return null

    return (
      <>
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
            <Row.Value
              onClick={toggleFeeModal}
              _hover={!isThorFreeTrade ? shapeShiftFeeModalRowHover : undefined}
            >
              <Flex alignItems='center' gap={2}>
                {bnOrZero(affiliateFeeAfterDiscountUserCurrency).gt(0) ? (
                  <>
                    <Amount.Fiat value={affiliateFeeAfterDiscountUserCurrency} />
                    <QuestionIcon />
                  </>
                ) : (
                  <>
                    <Text translation='trade.free' fontWeight='semibold' color={greenColor} />
                    {!isThorFreeTrade && <QuestionIcon color={greenColor} />}
                  </>
                )}
              </Flex>
            </Row.Value>
          </Row>

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

          {/* TODO: Hide the below unless expanded */}

          <Row>
            <Row.Label>
              <Text translation='trade.rate' />
            </Row.Label>
            <Row.Value>
              <HStack spacing={1}>
                <Amount.Crypto value='1' symbol={sellAssetSymbol} suffix='=' />
                <Amount.Crypto value={rate} symbol={buyAssetSymbol} />
              </HStack>
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
        <FeeModal
          isOpen={showFeeModal}
          onClose={toggleFeeModal}
          inputAmountUsd={sellAmountUsd}
          feeModel='SWAPPER'
        />
      </>
    )
  }, [
    activeQuote,
    affiliateFeeAfterDiscountUserCurrency,
    buyAmountAfterFeesCryptoPrecision,
    buyAsset.symbol,
    buyAssetSymbol,
    greenColor,
    hasIntermediaryTransactionOutputs,
    hasProtocolFees,
    intermediaryTransactionOutputs,
    isLoading,
    isThorFreeTrade,
    networkFeeFiatUserCurrency,
    priceImpactPercentage,
    protocolFeesParsed,
    rate,
    receiveAddress,
    redColor,
    sellAmountUsd,
    sellAsset.explorerAddressLink,
    sellAssetSymbol,
    showFeeModal,
    slippagePercentageDecimal,
    swapSource,
    swapperName,
    toggleFeeModal,
    tradeQuoteStep?.source,
    translate,
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
