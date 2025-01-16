import { InfoIcon } from '@chakra-ui/icons'
import { Button, Card, HStack, Stack } from '@chakra-ui/react'
import { SwapperName } from '@shapeshiftoss/swapper'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { Amount } from 'components/Amount/Amount'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text/Text'
import { TransactionDate } from 'components/TransactionHistoryRows/TransactionDate'
import { usePlaceLimitOrderMutation } from 'state/apis/limit-orders/limitOrderApi'
import {
  selectActiveQuote,
  selectActiveQuoteBuyAsset,
  selectActiveQuoteExpirationTimestamp,
  selectActiveQuoteFeeAsset,
  selectActiveQuoteLimitPrice,
  selectActiveQuoteNetworkFeeCryptoPrecision,
  selectActiveQuoteNetworkFeeUserCurrency,
  selectActiveQuoteSellAsset,
} from 'state/slices/limitOrderSlice/selectors'
import { useAppSelector } from 'state/store'

import { LimitOrderRoutePaths } from '../LimitOrder/types'
import { SharedConfirm } from '../SharedConfirm/SharedConfirm'
import { SharedConfirmFooter } from '../SharedConfirm/SharedConfirmFooter'
import { SwapperIcon } from '../TradeInput/components/SwapperIcon/SwapperIcon'

export const LimitOrderConfirm = () => {
  const history = useHistory()
  const translate = useTranslate()

  const activeQuote = useAppSelector(selectActiveQuote)
  const sellAsset = useAppSelector(selectActiveQuoteSellAsset)
  const buyAsset = useAppSelector(selectActiveQuoteBuyAsset)
  const feeAsset = useAppSelector(selectActiveQuoteFeeAsset)
  const networkFeeCryptoPrecision = useAppSelector(selectActiveQuoteNetworkFeeCryptoPrecision)
  const networkFeeUserCurrency = useAppSelector(selectActiveQuoteNetworkFeeUserCurrency)
  const limitPrice = useAppSelector(selectActiveQuoteLimitPrice)
  const quoteExpirationTimestamp = useAppSelector(selectActiveQuoteExpirationTimestamp)

  const handleBack = useCallback(() => {
    history.push(LimitOrderRoutePaths.Input)
  }, [history])

  const [_placeLimitOrder, { data: _data, error: _error, isLoading }] = usePlaceLimitOrderMutation()

  const handleConfirm = useCallback(() => {
    console.log('handleConfirm')
  }, [])

  const body = useMemo(() => {
    return <div>LimitOrderConfirm</div>
  }, [])

  const detail = useMemo(() => {
    return (
      <Stack spacing={4} width='full'>
        <Row>
          <Row.Label>
            <Text translation='limitOrder.limitPrice' />
          </Row.Label>
          <Row.Value textAlign='right'>
            <HStack>
              <Amount.Crypto value='1.0' symbol={sellAsset?.symbol ?? ''} />
              <RawText>=</RawText>
              <Amount.Crypto
                value={limitPrice?.buyAssetDenomination}
                symbol={buyAsset?.symbol ?? ''}
              />
            </HStack>
          </Row.Value>
        </Row>
        <Row>
          <Row.Label>
            <Text translation='limitOrder.provider' />
          </Row.Label>
          <Row.Value textAlign='right'>
            <HStack>
              <SwapperIcon swapperName={SwapperName.CowSwap} />
              <RawText>{SwapperName.CowSwap}</RawText>
            </HStack>
          </Row.Value>
        </Row>
        <Row>
          <Row.Label>
            <Text translation='limitOrder.expiration' />
          </Row.Label>
          <Row.Value>
            <TransactionDate blockTime={quoteExpirationTimestamp ?? 0} />
          </Row.Value>
        </Row>
        <Row>
          <Row.Label>
            <Text translation='limitOrder.networkFee' />
          </Row.Label>
          <Row.Value>
            <HStack justifyContent='flex-end'>
              <Amount.Crypto value={networkFeeCryptoPrecision} symbol={feeAsset?.symbol ?? ''} />
              <Amount.Fiat
                color={'text.subtle'}
                prefix='('
                suffix=')'
                noSpace
                value={networkFeeUserCurrency}
              />
            </HStack>
          </Row.Value>
        </Row>
        <Card bg='background.surface.raised.pressed' borderRadius={6} p={4} mb={2}>
          <HStack>
            <InfoIcon boxSize='1.3em' color='text.info' />
            <RawText>{translate('limitOrder.confirmInfo')}</RawText>
          </HStack>
        </Card>
      </Stack>
    )
  }, [
    buyAsset?.symbol,
    feeAsset?.symbol,
    limitPrice?.buyAssetDenomination,
    networkFeeCryptoPrecision,
    networkFeeUserCurrency,
    quoteExpirationTimestamp,
    sellAsset?.symbol,
    translate,
  ])

  const button = useMemo(() => {
    return (
      <Button
        colorScheme={'blue'}
        size='lg'
        width='full'
        onClick={handleConfirm}
        isLoading={isLoading}
        isDisabled={isLoading || !activeQuote}
      >
        <Text translation={'limitOrder.placeOrder'} />
      </Button>
    )
  }, [activeQuote, handleConfirm, isLoading])

  const footer = useMemo(() => {
    return <SharedConfirmFooter detail={detail} button={button} />
  }, [detail, button])

  return (
    <SharedConfirm
      bodyContent={body}
      footerContent={footer}
      isLoading={isLoading}
      onBack={handleBack}
      headerTranslation={'limitOrder.confirm'}
    />
  )
}
