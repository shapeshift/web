import { Box, Button, Center, Flex, Progress, Tag } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { OrderStatus } from '@shapeshiftoss/types/dist/cowSwap'
import { bn, fromBaseUnit } from '@shapeshiftoss/utils'
import { formatDistanceToNow } from 'date-fns'
import type { FC } from 'react'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { AssetIconWithBadge } from 'components/AssetIconWithBadge'
import { SwapBoldIcon } from 'components/Icons/SwapBold'
import { RawText, Text } from 'components/Text'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export interface LimitOrderCardProps {
  uid: string
  buyAmountCryptoBaseUnit: string
  sellAmountCryptoBaseUnit: string
  buyAssetId: AssetId
  sellAssetId: AssetId
  validTo?: number
  filledDecimalPercentage: number
  status: OrderStatus
  onCancel?: (uid: string) => void
}

const buttonBgHover = {
  bg: 'background.button.secondary.hover',
}

export const LimitOrderCard: FC<LimitOrderCardProps> = ({
  uid,
  buyAmountCryptoBaseUnit,
  sellAmountCryptoBaseUnit,
  buyAssetId,
  sellAssetId,
  validTo,
  filledDecimalPercentage,
  status,
  onCancel,
}) => {
  const translate = useTranslate()

  const buyAsset = useAppSelector(state => selectAssetById(state, buyAssetId))
  const sellAsset = useAppSelector(state => selectAssetById(state, sellAssetId))

  const handleCancel = useCallback(() => {
    onCancel?.(uid)
  }, [onCancel, uid])

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
    return bn(buyAmountCryptoPrecision).div(sellAmountCryptoPrecision).toString()
  }, [buyAmountCryptoPrecision, sellAmountCryptoPrecision])

  const tagColorScheme = useMemo(() => {
    switch (status) {
      case OrderStatus.OPEN:
        return 'blue'
      case OrderStatus.FULFILLED:
        return 'green'
      case OrderStatus.CANCELLED:
        return 'red'
      case OrderStatus.EXPIRED:
        return 'yellow'
      default:
        return 'gray'
    }
  }, [status])

  const barColorScheme = useMemo(() => {
    switch (status) {
      case OrderStatus.OPEN:
      case OrderStatus.FULFILLED:
        return 'green'
      case OrderStatus.CANCELLED:
        return 'red'
      case OrderStatus.EXPIRED:
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
        {status === OrderStatus.OPEN && (
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
