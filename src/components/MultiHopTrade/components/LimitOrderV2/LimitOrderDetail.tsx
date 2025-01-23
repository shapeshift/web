import { InfoIcon } from '@chakra-ui/icons'
import { Card, HStack, Stack } from '@chakra-ui/react'
import { SwapperName } from '@shapeshiftoss/swapper'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import { TransactionDate } from 'components/TransactionHistoryRows/TransactionDate'
import {
  selectActiveQuoteBuyAsset,
  selectActiveQuoteExpirationTimestamp,
  selectActiveQuoteFeeAsset,
  selectActiveQuoteLimitPrice,
  selectActiveQuoteNetworkFeeCryptoPrecision,
  selectActiveQuoteNetworkFeeUserCurrency,
  selectActiveQuoteSellAsset,
} from 'state/slices/limitOrderSlice/selectors'
import { useAppSelector } from 'state/store'

import { SwapperIcon } from '../TradeInput/components/SwapperIcon/SwapperIcon'

export const LimitOrderDetail = () => {
  const translate = useTranslate()

  const sellAsset = useAppSelector(selectActiveQuoteSellAsset)
  const buyAsset = useAppSelector(selectActiveQuoteBuyAsset)
  const feeAsset = useAppSelector(selectActiveQuoteFeeAsset)
  const networkFeeCryptoPrecision = useAppSelector(selectActiveQuoteNetworkFeeCryptoPrecision)
  const networkFeeUserCurrency = useAppSelector(selectActiveQuoteNetworkFeeUserCurrency)
  const limitPrice = useAppSelector(selectActiveQuoteLimitPrice)
  const quoteExpirationTimestamp = useAppSelector(selectActiveQuoteExpirationTimestamp)

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
}
