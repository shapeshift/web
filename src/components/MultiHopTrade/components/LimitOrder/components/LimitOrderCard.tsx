import { Box, Button, Center, Flex, Progress, Tag } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import type { FC } from 'react'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { AssetIconWithBadge } from 'components/AssetIconWithBadge'
import { SwapBoldIcon } from 'components/Icons/SwapBold'
import { RawText, Text } from 'components/Text'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { LimitOrderStatus } from '../types'

export interface LimitOrderCardProps {
  id: string
  buyAmount: number
  sellAmount: number
  buyAssetId: AssetId
  sellAssetId: AssetId
  expiry: number
  filledDecimalPercentage: number
  status: LimitOrderStatus
}

const buttonBgHover = {
  bg: 'background.button.secondary.hover',
}

export const LimitOrderCard: FC<LimitOrderCardProps> = ({
  id,
  buyAmount,
  sellAmount,
  buyAssetId,
  sellAssetId,
  expiry,
  filledDecimalPercentage,
  status,
}) => {
  const translate = useTranslate()

  const buyAsset = useAppSelector(state => selectAssetById(state, buyAssetId))
  const sellAsset = useAppSelector(state => selectAssetById(state, sellAssetId))

  const handleCancel = useCallback(() => {
    console.log(`Cancel limit order ${id}`)
  }, [id])

  const formattedPercentage = (filledDecimalPercentage * 100).toFixed(2)
  const limitPrice = (buyAmount / sellAmount).toFixed(6)

  const tagColorScheme = useMemo(() => {
    switch (status) {
      case LimitOrderStatus.Open:
        return 'blue'
      case LimitOrderStatus.Filled:
        return 'green'
      case LimitOrderStatus.Cancelled:
        return 'red'
      case LimitOrderStatus.Expired:
        return 'yellow'
      default:
        return 'gray'
    }
  }, [status])

  const barColorScheme = useMemo(() => {
    switch (status) {
      case LimitOrderStatus.Open:
      case LimitOrderStatus.Filled:
        return 'green'
      case LimitOrderStatus.Cancelled:
        return 'red'
      case LimitOrderStatus.Expired:
        return 'yellow'
      default:
        return 'gray'
    }
  }, [status])

  if (!buyAsset || !sellAsset) return null

  return (
    <Box
      key={id}
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
                value={sellAmount.toString()}
                symbol={sellAsset.symbol}
                color='gray.500'
                fontSize='xl'
              />
              <Amount.Crypto value={buyAmount.toString()} symbol={buyAsset.symbol} fontSize='xl' />
            </Flex>
          </Flex>
          <Tag colorScheme={tagColorScheme}>{translate(`limitOrders.status.${status}`)}</Tag>
        </Flex>

        {/* Price row */}
        <Flex justify='space-between' align='center'>
          <Text color='gray.500' translation='limitOrders.limitPrice' />
          <Flex justify='flex-end'>
            <RawText mr={1}>{`1 ${sellAsset.symbol} =`}</RawText>
            <Amount.Crypto value={limitPrice} symbol={buyAsset.symbol} />
          </Flex>
        </Flex>

        {/* Expiry row */}
        <Flex justify='space-between' align='center'>
          <Text color='gray.500' translation='limitOrders.expiresIn' />
          <RawText>{`${expiry} days`}</RawText>
        </Flex>

        {/* Filled row */}
        <Flex justify='space-between' align='center'>
          <Text color='gray.500' translation='limitOrders.filled' />
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
        {status === LimitOrderStatus.Open && (
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
