import { InfoIcon } from '@chakra-ui/icons'
import { Card, HStack, Stack } from '@chakra-ui/react'
import { SwapperName } from '@shapeshiftoss/swapper'
import { useTranslate } from 'react-polyglot'

import { RateGasRow } from '../RateGasRow'

import { Row } from '@/components/Row/Row'
import { RawText, Text } from '@/components/Text'
import { TransactionDate } from '@/components/TransactionHistoryRows/TransactionDate'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { DEFAULT_FEE_BPS } from '@/lib/fees/parameters/swapper'
import {
  selectActiveQuoteBuyAsset,
  selectActiveQuoteExpirationTimestamp,
  selectActiveQuoteLimitPrice,
  selectActiveQuoteSellAsset,
} from '@/state/slices/limitOrderSlice/selectors'
import { useAppSelector } from '@/state/store'

const rateGasRowSx = {
  mb: 3,
}

export const LimitOrderDetail = () => {
  const translate = useTranslate()

  const sellAsset = useAppSelector(selectActiveQuoteSellAsset)
  const buyAsset = useAppSelector(selectActiveQuoteBuyAsset)
  const limitPrice = useAppSelector(selectActiveQuoteLimitPrice)
  const quoteExpirationTimestamp = useAppSelector(selectActiveQuoteExpirationTimestamp)

  return (
    <RateGasRow
      affiliateBps={DEFAULT_FEE_BPS.toString()}
      buyAssetId={buyAsset?.assetId ?? ''}
      sellAssetId={sellAsset?.assetId ?? ''}
      rate={bnOrZero(limitPrice?.buyAssetDenomination).toFixed(buyAsset?.precision ?? 0)}
      networkFeeFiatUserCurrency='0' // no network fees for CoW, this is a message signing
      swapperName={SwapperName.CowSwap}
      swapSource={SwapperName.CowSwap}
      sx={rateGasRowSx}
    >
      <Stack spacing={4} width='full' px={6} py={3}>
        <Row>
          <Row.Label>
            <Text translation='limitOrder.expiration' />
          </Row.Label>
          <Row.Value>
            <TransactionDate blockTime={quoteExpirationTimestamp ?? 0} />
          </Row.Value>
        </Row>
        <Card borderRadius={6} p={4} mb={2}>
          <HStack>
            <InfoIcon boxSize='1.3em' color='text.info' />
            <RawText>{translate('limitOrder.confirmInfo')}</RawText>
          </HStack>
        </Card>
      </Stack>
    </RateGasRow>
  )
}
