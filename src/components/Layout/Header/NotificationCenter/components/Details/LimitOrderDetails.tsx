import { Button, ButtonGroup, HStack, Progress, Stack } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import { fromBaseUnit } from '@shapeshiftoss/utils'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { Amount } from '@/components/Amount/Amount'
import { HoverTooltip } from '@/components/HoverTooltip/HoverTooltip'
import { Row } from '@/components/Row/Row'
import { RawText } from '@/components/Text'
import { TransactionDate } from '@/components/TransactionHistoryRows/TransactionDate'
import { useLocaleFormatter } from '@/hooks/useLocaleFormatter/useLocaleFormatter'
import { bn, bnOrZero } from '@/lib/bignumber/bignumber'
import { ActionStatus } from '@/state/slices/actionSlice/types'
import type { LimitPriceByDirection } from '@/state/slices/limitOrderInputSlice/limitOrderInputSlice'

type LimitOrderDetailsProps = {
  buyAsset: Asset
  sellAsset: Asset
  expires?: number
  filledDecimalPercentage?: string
  status: ActionStatus
  buyAmountCryptoPrecision: string
  sellAmountCryptoPrecision: string
  executedBuyAmountCryptoBaseUnit?: string
  executedSellAmountCryptoBaseUnit?: string
  limitPrice: LimitPriceByDirection
}

export const LimitOrderDetails = ({
  buyAsset,
  sellAsset,
  expires,
  limitPrice,
  executedBuyAmountCryptoBaseUnit,
  executedSellAmountCryptoBaseUnit,
  filledDecimalPercentage,
  status,
}: LimitOrderDetailsProps) => {
  const translate = useTranslate()
  const {
    number: { toCrypto },
  } = useLocaleFormatter()

  const pair = useMemo(() => {
    return `${buyAsset.symbol}/${sellAsset.symbol}`
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
    if (!executedBuyAmountCryptoPrecision || !executedSellAmountCryptoPrecision) return '0'
    return bn(executedBuyAmountCryptoPrecision).div(executedSellAmountCryptoPrecision).toFixed()
  }, [executedBuyAmountCryptoPrecision, executedSellAmountCryptoPrecision])

  const executionPriceCryptoFormatted = useMemo(
    () => toCrypto(executionPrice, buyAsset?.symbol ?? ''),
    [executionPrice, toCrypto, buyAsset],
  )

  return (
    <Stack gap={4}>
      <Row fontSize='sm'>
        <Row.Label>{translate('notificationCenter.pair')}</Row.Label>
        <Row.Value>
          <RawText>{pair}</RawText>
        </Row.Value>
      </Row>
      <Row fontSize='sm'>
        <Row.Label>{translate('notificationCenter.limitPrice')}</Row.Label>
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
      {expires ? (
        <Row fontSize='sm'>
          <Row.Label>{translate('notificationCenter.expires')}</Row.Label>
          <Row.Value>
            <TransactionDate blockTime={expires} />
          </Row.Value>
        </Row>
      ) : null}
      {executedBuyAmountCryptoBaseUnit && executedSellAmountCryptoBaseUnit ? (
        <Row fontSize='sm'>
          <Row.Label>{translate('notificationCenter.executionPrice')}</Row.Label>
          <Row.Value>
            <HoverTooltip placement='top' label={executionPriceCryptoFormatted}>
              <Amount.Crypto
                value={executionPrice}
                symbol={buyAsset.symbol}
                maximumFractionDigits={6}
              />
            </HoverTooltip>
          </Row.Value>
        </Row>
      ) : null}
      <Row fontSize='sm'>
        <Row.Label>{translate('notificationCenter.filled')}</Row.Label>
        <Row.Value display='flex' alignItems='center' gap={2}>
          <Progress
            width='100px'
            size='xs'
            value={bnOrZero(filledDecimalPercentage).times(100).toNumber()}
            colorScheme='green'
          />
          <RawText>{formattedFilled}</RawText>
        </Row.Value>
      </Row>
      {status === ActionStatus.Open && (
        <ButtonGroup width='full' size='sm'>
          <Button width='full'>{translate('notificationCenter.viewOrder')}</Button>
          <Button width='full'>{translate('notificationCenter.cancelOrder')}</Button>
        </ButtonGroup>
      )}
    </Stack>
  )
}
