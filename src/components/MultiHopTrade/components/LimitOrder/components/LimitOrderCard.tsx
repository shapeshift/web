import { Box, Button, Center, Flex, Progress, Tag } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { OrderStatus } from '@shapeshiftoss/types'
import { bn, fromBaseUnit } from '@shapeshiftoss/utils'
import { formatDistanceToNow } from 'date-fns'
import type { FC } from 'react'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { AssetIconWithBadge } from 'components/AssetIconWithBadge'
import { SwapBoldIcon } from 'components/Icons/SwapBold'
import { RawText, Text } from 'components/Text'
import { assertUnreachable } from 'lib/utils'
import {
  selectAssetById,
  selectPortfolioCryptoBalanceBaseUnitByFilter,
} from 'state/slices/selectors'
import { useSelectorWithArgs } from 'state/store'

import { LimitOrderStatus } from '../types'

export interface LimitOrderCardProps {
  accountId: AccountId
  uid: string
  buyAmountCryptoBaseUnit: string
  sellAmountCryptoBaseUnit: string
  buyAssetId: AssetId
  sellAssetId: AssetId
  validTo?: number
  filledDecimalPercentage: number
  status: OrderStatus
  onCancelClick?: (uid: string) => void
}

const buttonBgHover = {
  bg: 'background.button.secondary.hover',
}

export const LimitOrderCard: FC<LimitOrderCardProps> = ({
  accountId,
  uid,
  buyAmountCryptoBaseUnit,
  sellAmountCryptoBaseUnit,
  buyAssetId,
  sellAssetId,
  validTo,
  filledDecimalPercentage,
  status: _status,
  onCancelClick,
}) => {
  const translate = useTranslate()

  const buyAsset = useSelectorWithArgs(selectAssetById, buyAssetId)
  const sellAsset = useSelectorWithArgs(selectAssetById, sellAssetId)
  const filter = useMemo(() => ({ assetId: sellAssetId, accountId }), [sellAssetId, accountId])
  const sellAssetBalanceCryptoBaseUnit = useSelectorWithArgs(
    selectPortfolioCryptoBalanceBaseUnitByFilter,
    filter,
  )

  const handleCancel = useCallback(() => {
    onCancelClick?.(uid)
  }, [onCancelClick, uid])

  const formattedPercentage = (filledDecimalPercentage * 100).toFixed(2)

  const sellAmountCryptoPrecision = useMemo(
    () => fromBaseUnit(sellAmountCryptoBaseUnit, sellAsset?.precision ?? 0),
    [sellAmountCryptoBaseUnit, sellAsset?.precision],
  )

  const buyAmountCryptoPrecision = useMemo(
    () => fromBaseUnit(buyAmountCryptoBaseUnit, buyAsset?.precision ?? 0),
    [buyAmountCryptoBaseUnit, buyAsset?.precision],
  )

  const limitPrice = useMemo(() => {
    return bn(buyAmountCryptoPrecision).div(sellAmountCryptoPrecision).toFixed()
  }, [buyAmountCryptoPrecision, sellAmountCryptoPrecision])

  const hasSufficientSellAssetBalance = useMemo(() => {
    return bn(sellAssetBalanceCryptoBaseUnit).gte(sellAmountCryptoBaseUnit)
  }, [sellAssetBalanceCryptoBaseUnit, sellAmountCryptoBaseUnit])

  const status = useMemo(() => {
    switch (_status) {
      case OrderStatus.OPEN:
        if (hasSufficientSellAssetBalance) {
          return LimitOrderStatus.Open
        } else {
          return LimitOrderStatus.Unfillable
        }
      case OrderStatus.FULFILLED:
        return LimitOrderStatus.Fulfilled
      case OrderStatus.CANCELLED:
        return LimitOrderStatus.Cancelled
      case OrderStatus.EXPIRED:
        return LimitOrderStatus.Expired
      case OrderStatus.PRESIGNATURE_PENDING:
        return LimitOrderStatus.Unknown
      default:
        assertUnreachable(_status)
    }
  }, [_status, hasSufficientSellAssetBalance])

  const tagColorScheme = useMemo(() => {
    switch (status) {
      case LimitOrderStatus.Open:
        return 'blue'
      case LimitOrderStatus.Fulfilled:
        return 'green'
      case LimitOrderStatus.Unfillable:
        return 'purple'
      case LimitOrderStatus.Cancelled:
        return 'red'
      case LimitOrderStatus.Expired:
        return 'yellow'
      case LimitOrderStatus.Unknown:
      default:
        return 'gray'
    }
  }, [status])

  const barColorScheme = useMemo(() => {
    switch (status) {
      case LimitOrderStatus.Open:
      case LimitOrderStatus.Fulfilled:
        return 'green'
      case LimitOrderStatus.Unfillable:
      case LimitOrderStatus.Cancelled:
        return 'red'
      case LimitOrderStatus.Expired:
        return 'yellow'
      default:
        return 'gray'
    }
  }, [status])

  const expiryText = useMemo(
    () =>
      validTo
        ? formatDistanceToNow(validTo * 1000, {
            addSuffix: true,
          })
        : undefined,
    [validTo],
  )

  const isCancelable = useMemo(() => {
    return [LimitOrderStatus.Open, LimitOrderStatus.Unfillable].includes(status)
  }, [status])

  if (!buyAsset || !sellAsset) return null

  return (
    <Box
      borderRadius='2xl'
      p={4}
      width='100%'
      border='1px solid'
      borderColor='whiteAlpha.100'
      mb={4}
    >
      <Flex direction='column' gap={4}>
        {/* Asset amounts row */}
        <Flex justify='space-between' align='flex-start'>
          <Flex>
            <AssetIconWithBadge size='lg' assetId={buyAssetId} secondaryAssetId={sellAssetId}>
              <Center borderRadius='full' boxSize='100%' bg='purple.500'>
                <SwapBoldIcon boxSize='100%' />
              </Center>
            </AssetIconWithBadge>
            <Flex direction='column' align='flex-start' ml={4}>
              <Amount.Crypto
                value={sellAmountCryptoPrecision}
                symbol={sellAsset.symbol}
                color='gray.500'
                fontSize='xl'
              />
              <Amount.Crypto
                value={buyAmountCryptoPrecision}
                symbol={buyAsset.symbol}
                fontSize='xl'
              />
            </Flex>
          </Flex>
          <Tag colorScheme={tagColorScheme}>{translate(`limitOrder.status.${status}`)}</Tag>
        </Flex>

        {/* Price row */}
        <Flex justify='space-between' align='center'>
          <Text color='gray.500' translation='limitOrder.limitPrice' />
          <Flex justify='flex-end'>
            <RawText mr={1}>{`1 ${sellAsset.symbol} =`}</RawText>
            <Amount.Crypto value={limitPrice} symbol={buyAsset.symbol} />
          </Flex>
        </Flex>

        {/* Expiry row - excluded for historical orders*/}
        {Boolean(expiryText) && (
          <Flex justify='space-between' align='center'>
            <Text color='gray.500' translation='limitOrder.expiresIn' />
            <RawText>{expiryText}</RawText>
          </Flex>
        )}

        {/* Filled row */}
        <Flex justify='space-between' align='center'>
          <Text color='gray.500' translation='limitOrder.status.fulfilled' />
          <Flex align='center' gap={4} width='60%'>
            <Progress
              value={filledDecimalPercentage * 100}
              width='100%'
              borderRadius='full'
              colorScheme={barColorScheme}
            />
            <RawText>{`${formattedPercentage}%`}</RawText>
          </Flex>
        </Flex>

        {/* Cancel button */}
        {isCancelable && (
          <Button
            colorScheme='red'
            width='100%'
            mt={2}
            color='red.500'
            onClick={handleCancel}
            bg='background.button.secondary.base'
            _hover={buttonBgHover}
          >
            <Text translation='common.cancel' />
          </Button>
        )}
      </Flex>
    </Box>
  )
}
