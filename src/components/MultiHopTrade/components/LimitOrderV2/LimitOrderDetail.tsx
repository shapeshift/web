import { InfoIcon } from '@chakra-ui/icons'
import { Card, HStack, Stack } from '@chakra-ui/react'
import { SwapperName } from '@shapeshiftoss/swapper'
import { useTranslate } from 'react-polyglot'

import { RateGasRow } from '../RateGasRow'

import { Row } from '@/components/Row/Row'
import { RawText, Text } from '@/components/Text'
import { TransactionDate } from '@/components/TransactionHistoryRows/TransactionDate'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import type { ParameterModel } from '@/lib/fees/parameters/types'
import { selectCalculatedFees } from '@/state/apis/snapshot/selectors'
import {
  selectActiveQuoteBuyAsset,
  selectActiveQuoteExpirationTimestamp,
  selectActiveQuoteLimitPrice,
  selectActiveQuoteSellAmountCryptoPrecision,
  selectActiveQuoteSellAsset,
} from '@/state/slices/limitOrderSlice/selectors'
import { selectMarketDataByAssetIdUserCurrency } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export const LimitOrderDetail = () => {
  const translate = useTranslate()

  const sellAsset = useAppSelector(selectActiveQuoteSellAsset)
  const buyAsset = useAppSelector(selectActiveQuoteBuyAsset)
  const limitPrice = useAppSelector(selectActiveQuoteLimitPrice)
  const quoteExpirationTimestamp = useAppSelector(selectActiveQuoteExpirationTimestamp)
  const sellAmountCryptoPrecision = useAppSelector(selectActiveQuoteSellAmountCryptoPrecision)

  const sellAssetMarketData = useAppSelector(state =>
    sellAsset ? selectMarketDataByAssetIdUserCurrency(state, sellAsset.assetId) : undefined,
  )

  const inputAmountUsd = bnOrZero(sellAmountCryptoPrecision)
    .times(bnOrZero(sellAssetMarketData?.price))
    .toString()

  const { feeBps } = useAppSelector(state =>
    selectCalculatedFees(state, {
      feeModel: 'SWAPPER' as ParameterModel,
      inputAmountUsd,
    }),
  )

  return (
    <RateGasRow
      affiliateBps={feeBps?.toFixed(0)}
      buyAssetId={buyAsset?.assetId ?? ''}
      sellAssetId={sellAsset?.assetId ?? ''}
      rate={bnOrZero(limitPrice?.buyAssetDenomination).toFixed(buyAsset?.precision ?? 0)}
      networkFeeFiatUserCurrency='0' // no network fees for CoW, this is a message signing
      swapperName={SwapperName.CowSwap}
      swapSource={SwapperName.CowSwap}
      isDisabled // disable swapper switcher, we're only dealing with CoW here
    >
      <Stack spacing={4} width='full' px={6} pb={3}>
        <Row>
          <Row.Label>
            <Text translation='limitOrder.expiration' />
          </Row.Label>
          <Row.Value>
            <TransactionDate blockTime={quoteExpirationTimestamp ?? 0} />
          </Row.Value>
        </Row>
        <Card bg='background.surface.raised.pressed' borderRadius={6} p={4} mb={2}>
          <HStack>
            <InfoIcon boxSize='1.3em' color='text.info' />
            <RawText>{translate('limitOrder.confirmInfo')}</RawText>
          </HStack>
        </Card>
      </Stack>
    </RateGasRow>
  )
}
