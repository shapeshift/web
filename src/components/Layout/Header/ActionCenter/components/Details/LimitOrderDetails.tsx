import { ExternalLinkIcon } from '@chakra-ui/icons'
import { Button, ButtonGroup, HStack, Link, Progress, Stack } from '@chakra-ui/react'
import type { Order } from '@shapeshiftoss/types'
import { OrderStatus } from '@shapeshiftoss/types'
import { fromBaseUnit } from '@shapeshiftoss/utils'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { Amount } from '@/components/Amount/Amount'
import { HoverTooltip } from '@/components/HoverTooltip/HoverTooltip'
import type { OrderToCancel } from '@/components/MultiHopTrade/components/LimitOrder/types'
import { Row } from '@/components/Row/Row'
import { RawText } from '@/components/Text'
import { TransactionDate } from '@/components/TransactionHistoryRows/TransactionDate'
import { useLocaleFormatter } from '@/hooks/useLocaleFormatter/useLocaleFormatter'
import { bn, bnOrZero } from '@/lib/bignumber/bignumber'
import type { LimitOrderAction } from '@/state/slices/actionSlice/types'
import { ActionStatus } from '@/state/slices/actionSlice/types'

type LimitOrderDetailsProps = {
  order: Order
  action: LimitOrderAction
  onCancelOrder: (order: OrderToCancel) => void
}

export const LimitOrderDetails = ({ order, action, onCancelOrder }: LimitOrderDetailsProps) => {
  const translate = useTranslate()
  const {
    number: { toCrypto },
  } = useLocaleFormatter()
  const {
    buyAsset,
    sellAsset,
    executedBuyAmountCryptoBaseUnit,
    executedSellAmountCryptoBaseUnit,
    filledDecimalPercentage,
    expires,
    limitPrice,
  } = action.limitOrderMetadata
  const status = action.status

  const pair = useMemo(() => {
    return `${buyAsset?.symbol}/${sellAsset?.symbol}`
  }, [buyAsset, sellAsset])

  const executedBuyAmountCryptoPrecision = useMemo(
    () =>
      executedBuyAmountCryptoBaseUnit
        ? fromBaseUnit(executedBuyAmountCryptoBaseUnit, buyAsset?.precision ?? 0)
        : '0',
    [executedBuyAmountCryptoBaseUnit, buyAsset?.precision],
  )

  const executedSellAmountCryptoPrecision = useMemo(
    () =>
      executedSellAmountCryptoBaseUnit
        ? fromBaseUnit(executedSellAmountCryptoBaseUnit, sellAsset?.precision ?? 0)
        : '0',
    [executedSellAmountCryptoBaseUnit, sellAsset?.precision],
  )

  const formattedFilled = useMemo(() => {
    return `${bnOrZero(filledDecimalPercentage).times(100).toFixed(0)}%`
  }, [filledDecimalPercentage])

  const executionPrice = useMemo(() => {
    if (!executedBuyAmountCryptoPrecision || !executedSellAmountCryptoPrecision) return
    return bn(executedBuyAmountCryptoPrecision).div(executedSellAmountCryptoPrecision).toFixed()
  }, [executedBuyAmountCryptoPrecision, executedSellAmountCryptoPrecision])

  const executionPriceCryptoFormatted = useMemo(() => {
    if (!executionPrice) return

    return toCrypto(executionPrice, buyAsset?.symbol ?? '')
  }, [executionPrice, toCrypto, buyAsset])

  const orderToCancel = useMemo(() => {
    if (order.status !== OrderStatus.OPEN) return undefined

    return {
      accountId: action.limitOrderMetadata.accountId,
      sellAssetId: action.limitOrderMetadata.sellAsset.assetId,
      buyAssetId: action.limitOrderMetadata.buyAsset.assetId,
      order,
    }
  }, [action, order])

  const handleCancelOrder = useCallback(() => {
    if (!orderToCancel) return
    onCancelOrder(orderToCancel)
  }, [onCancelOrder, orderToCancel])

  const filledPercentageHuman = useMemo(
    () => bnOrZero(filledDecimalPercentage).times(100).toNumber(),
    [filledDecimalPercentage],
  )

  return (
    <Stack gap={4}>
      <Row fontSize='sm'>
        <Row.Label>{translate('actionCenter.pair')}</Row.Label>
        <Row.Value>
          <RawText>{pair}</RawText>
        </Row.Value>
      </Row>
      <Row fontSize='sm'>
        <Row.Label>{translate('actionCenter.limitPrice')}</Row.Label>
        <Row.Value>
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
      {expires !== undefined ? (
        <Row fontSize='sm'>
          <Row.Label>{translate('actionCenter.expires')}</Row.Label>
          <Row.Value>
            <TransactionDate blockTime={expires} />
          </Row.Value>
        </Row>
      ) : null}
      {executionPrice ? (
        <Row fontSize='sm'>
          <Row.Label>{translate('actionCenter.executionPrice')}</Row.Label>
          <Row.Value>
            <HoverTooltip placement='top' label={executionPriceCryptoFormatted}>
              <Amount.Crypto
                value={executionPrice}
                symbol={buyAsset?.symbol ?? ''}
                maximumFractionDigits={6}
              />
            </HoverTooltip>
          </Row.Value>
        </Row>
      ) : null}
      <Row fontSize='sm'>
        <Row.Label>{translate('actionCenter.filled')}</Row.Label>
        <Row.Value display='flex' alignItems='center' gap={2}>
          <Progress width='100px' size='xs' value={filledPercentageHuman} colorScheme='green' />
          <RawText>{formattedFilled}</RawText>
        </Row.Value>
      </Row>
      <ButtonGroup width='full' size='sm'>
        <Button
          as={Link}
          href={`https://explorer.cow.fi/orders/${order.uid}`}
          isExternal
          width='full'
        >
          {translate('actionCenter.viewOrder')}
          <ExternalLinkIcon ml='2' />
        </Button>
        {status === ActionStatus.Open && (
          <Button width='full' onClick={handleCancelOrder}>
            {translate('actionCenter.cancelOrder')}
          </Button>
        )}
      </ButtonGroup>
    </Stack>
  )
}
