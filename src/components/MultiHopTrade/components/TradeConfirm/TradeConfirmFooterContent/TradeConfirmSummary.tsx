import { ChevronDownIcon, ChevronUpIcon, ExternalLinkIcon, QuestionIcon } from '@chakra-ui/icons'
import type { ButtonProps } from '@chakra-ui/react'
import {
  Box,
  Button,
  Collapse,
  Flex,
  HStack,
  Icon,
  Link,
  Stack,
  Tooltip,
  useColorModeValue,
} from '@chakra-ui/react'
import { getHopByIndex } from '@shapeshiftoss/swapper'
import { bnOrZero, fromBaseUnit, isSome } from '@shapeshiftoss/utils'
import { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { FeeModal } from 'components/FeeModal/FeeModal'
import { parseAmountDisplayMeta } from 'components/MultiHopTrade/helpers'
import { usePriceImpact } from 'components/MultiHopTrade/hooks/quoteValidation/usePriceImpact'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import { useToggle } from 'hooks/useToggle/useToggle'
import { THORSWAP_MAXIMUM_YEAR_TRESHOLD, THORSWAP_UNIT_THRESHOLD } from 'lib/fees/model'
import { middleEllipsis } from 'lib/utils'
import { selectThorVotingPower } from 'state/apis/snapshot/selectors'
import { selectMarketDataUserCurrency } from 'state/slices/marketDataSlice/selectors'
import { selectFeeAssetById } from 'state/slices/selectors'
import {
  selectInputBuyAsset,
  selectInputSellAmountUsd,
  selectInputSellAsset,
  selectIsActiveQuoteMultiHop,
} from 'state/slices/tradeInputSlice/selectors'
import {
  selectActiveQuote,
  selectActiveSwapperName,
  selectBuyAmountAfterFeesCryptoPrecision,
  selectFirstHop,
  selectFirstHopNetworkFeeCryptoBaseUnit,
  selectFirstHopNetworkFeeUserCurrency,
  selectSecondHopNetworkFeeCryptoBaseUnit,
  selectSecondHopNetworkFeeUserCurrency,
  selectTotalProtocolFeeByAsset,
  selectTradeQuoteAffiliateFeeAfterDiscountUserCurrency,
  selectTradeSlippagePercentageDecimal,
} from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector, useSelectorWithArgs } from 'state/store'

import { useIsApprovalInitiallyNeeded } from '../../MultiHopTradeConfirm/hooks/useIsApprovalInitiallyNeeded'
import { PriceImpact } from '../../PriceImpact'
import { MaxSlippage } from '../../TradeInput/components/MaxSlippage'
import { SwapperIcon } from '../../TradeInput/components/SwapperIcon/SwapperIcon'

const ProtocolFeeToolTip = () => {
  return <Text color='text.subtle' translation={'trade.tooltip.protocolFee'} />
}

const shapeShiftFeeModalRowHover = { textDecoration: 'underline', cursor: 'pointer' }
const hoverProps = {
  backgroundColor: 'background.surface.overlay.hover',
}
const activeProps = {
  backgroundColor: 'background.surface.raised',
}

const ShowMoreButton = (props: ButtonProps) => (
  <Box position='relative' width='full' height='0' top='-18px'>
    <Button
      position='absolute'
      left='50%'
      transform='translate(-50%, -50%)'
      borderRadius='full'
      backgroundColor='background.surface.overlay.base'
      border='2px solid'
      borderColor='border.base'
      size='sm'
      px={4}
      zIndex={1}
      _hover={hoverProps}
      _active={activeProps}
      color='text.subtle'
      {...props}
    />
  </Box>
)

export const TradeConfirmSummary = () => {
  const swapperName = useAppSelector(selectActiveSwapperName)
  const activeQuote = useAppSelector(selectActiveQuote)
  const buyAsset = useAppSelector(selectInputBuyAsset)
  const sellAsset = useAppSelector(selectInputSellAsset)
  const buyAmountAfterFeesCryptoPrecision = useAppSelector(selectBuyAmountAfterFeesCryptoPrecision)
  const slippagePercentageDecimal = useAppSelector(selectTradeSlippagePercentageDecimal)
  const totalProtocolFees = useAppSelector(selectTotalProtocolFeeByAsset)
  const firstHopFeeAsset = useSelectorWithArgs(selectFeeAssetById, sellAsset.assetId)
  const secondHop = getHopByIndex(activeQuote, 1)
  const secondHopFeeAsset = useSelectorWithArgs(
    selectFeeAssetById,
    secondHop?.sellAsset.assetId ?? '',
  )
  const isMultiHopTrade = useAppSelector(selectIsActiveQuoteMultiHop)
  const sellAmountUsd = useAppSelector(selectInputSellAmountUsd)
  const affiliateFeeAfterDiscountUserCurrency = useAppSelector(
    selectTradeQuoteAffiliateFeeAfterDiscountUserCurrency,
  )
  const marketDataUserCurrency = useAppSelector(selectMarketDataUserCurrency)
  const firstHopNetworkFeeUserCurrency = useAppSelector(selectFirstHopNetworkFeeUserCurrency)
  const secondHopNetworkFeeUserCurrency = useAppSelector(selectSecondHopNetworkFeeUserCurrency)
  const firstHopNetworkFeeCryptoBaseUnit = useAppSelector(selectFirstHopNetworkFeeCryptoBaseUnit)
  const secondHopNetworkFeeCryptoBaseUnit = useAppSelector(selectSecondHopNetworkFeeCryptoBaseUnit)
  const tradeQuoteFirstHop = useAppSelector(selectFirstHop)
  const translate = useTranslate()
  const { priceImpactPercentage } = usePriceImpact(activeQuote)
  const { isLoading } = useIsApprovalInitiallyNeeded()
  const greenColor = useColorModeValue('green.600', 'green.200')
  const [showFeeModal, setShowFeeModal] = useState(false)
  const thorVotingPower = useAppSelector(selectThorVotingPower)
  const receiveAddress = activeQuote?.receiveAddress
  const swapSource = tradeQuoteFirstHop?.source
  const rate = tradeQuoteFirstHop?.rate
  const sellAssetSymbol = sellAsset.symbol
  const buyAssetSymbol = buyAsset.symbol
  const intermediaryTransactionOutputs = tradeQuoteFirstHop?.intermediaryTransactionOutputs
  const intermediaryTransactionOutputsParsed = intermediaryTransactionOutputs
    ? parseAmountDisplayMeta(intermediaryTransactionOutputs)
    : undefined
  const hasIntermediaryTransactionOutputs =
    intermediaryTransactionOutputsParsed && intermediaryTransactionOutputsParsed.length > 0
  const protocolFeesParsed = totalProtocolFees
    ? parseAmountDisplayMeta(Object.values(totalProtocolFees).filter(isSome))
    : undefined
  const hasProtocolFees = protocolFeesParsed && protocolFeesParsed.length > 0

  const firstHopNetworkFeeCryptoPrecision = useMemo(() => {
    if (!firstHopNetworkFeeCryptoBaseUnit) return undefined
    return fromBaseUnit(firstHopNetworkFeeCryptoBaseUnit, firstHopFeeAsset?.precision ?? 0)
  }, [firstHopNetworkFeeCryptoBaseUnit, firstHopFeeAsset?.precision])

  const secondHopNetworkFeeCryptoPrecision = useMemo(() => {
    if (!secondHopNetworkFeeCryptoBaseUnit) return undefined
    return fromBaseUnit(secondHopNetworkFeeCryptoBaseUnit, firstHopFeeAsset?.precision ?? 0)
  }, [secondHopNetworkFeeCryptoBaseUnit, firstHopFeeAsset?.precision])

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

  const [showMore, toggleShowMore] = useToggle(false)

  return (
    <>
      <ShowMoreButton
        onClick={toggleShowMore}
        rightIcon={showMore ? <ChevronUpIcon /> : <ChevronDownIcon />}
      >
        {translate(showMore ? 'common.showLess' : 'common.showMore')}
      </ShowMoreButton>

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

        {hasProtocolFees && (
          <Row Tooltipbody={ProtocolFeeToolTip} isLoading={isLoading}>
            <Row.Label>
              <Text translation='trade.protocolFee' />
            </Row.Label>
            <Row.Value color='text.base'>
              {protocolFeesParsed?.map(({ amountCryptoPrecision, assetId, symbol }) => (
                <HStack key={assetId} justifyContent='flex-end'>
                  <Amount.Crypto value={amountCryptoPrecision} symbol={symbol} />
                  {assetId && (
                    <Amount.Fiat
                      color={'text.subtle'}
                      prefix='('
                      suffix=')'
                      noSpace
                      value={bnOrZero(marketDataUserCurrency[assetId]?.price ?? 0)
                        .times(amountCryptoPrecision)
                        .toNumber()}
                    />
                  )}
                </HStack>
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

        <Collapse in={showMore}>
          <Stack spacing={4}>
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
              swapSource={tradeQuoteFirstHop?.source}
              isLoading={isLoading}
              symbol={buyAsset.symbol}
              amountCryptoPrecision={buyAmountAfterFeesCryptoPrecision ?? '0'}
              slippagePercentageDecimal={slippagePercentageDecimal}
              hasIntermediaryTransactionOutputs={hasIntermediaryTransactionOutputs}
              intermediaryTransactionOutputs={intermediaryTransactionOutputs}
            />

            {priceImpactPercentage && <PriceImpact priceImpactPercentage={priceImpactPercentage} />}
          </Stack>
        </Collapse>
      </Stack>
      <FeeModal
        isOpen={showFeeModal}
        onClose={toggleFeeModal}
        inputAmountUsd={sellAmountUsd}
        feeModel='SWAPPER'
      />
    </>
  )
}
