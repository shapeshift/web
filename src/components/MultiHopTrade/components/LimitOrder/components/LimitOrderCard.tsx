import type { CenterProps } from '@chakra-ui/react'
import { Box, Button, Center, Flex, Progress, Tag } from '@chakra-ui/react'
import { ethAssetId } from '@shapeshiftoss/caip'
import { type FC, useCallback, useMemo } from 'react'
import { AssetIconWithBadge } from 'components/AssetIconWithBadge'
import { SwapBoldIcon } from 'components/Icons/SwapBold'
import { RawText, Text } from 'components/Text'

import { LimitOrderStatus } from '../types'

export interface LimitOrderCardProps {
  id: string
  buyAmount: number
  sellAmount: number
  buyAssetSymbol: string
  sellAssetSymbol: string
  expiry: number
  filledDecimalPercentage: number
  status: LimitOrderStatus
}

// TODO: rm me
const IconWrapper: React.FC<CenterProps> = props => (
  <Center borderRadius='full' boxSize='100%' {...props} />
)

export const LimitOrderCard: FC<LimitOrderCardProps> = ({
  id,
  buyAmount,
  sellAmount,
  buyAssetSymbol,
  sellAssetSymbol,
  expiry,
  filledDecimalPercentage,
  status,
}) => {
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
      default:
        return 'gray'
    }
  }, [status])

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
        <Flex justify='space-between' align='center'>
          <Flex>
            <AssetIconWithBadge size='lg' assetId={ethAssetId}>
              <IconWrapper bg='purple.500'>
                <SwapBoldIcon boxSize='100%' />
              </IconWrapper>
            </AssetIconWithBadge>
            <Flex direction='column' align='flex-start' ml={4}>
              <RawText
                color='gray.500'
                fontSize='xl'
              >{`${sellAmount.toLocaleString()} ${sellAssetSymbol}`}</RawText>
              <RawText
                fontWeight='bold'
                fontSize='xl'
              >{`${buyAmount.toLocaleString()} ${buyAssetSymbol}`}</RawText>
            </Flex>
          </Flex>
          <Tag colorScheme={tagColorScheme}>{status}</Tag>
        </Flex>

        {/* Price row */}
        <Flex justify='space-between' align='center'>
          <Text color='gray.500' translation='limitOrders.limitPrice' />
          <RawText>{`1 ${sellAssetSymbol} = ${limitPrice} ${buyAssetSymbol}`}</RawText>
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
              colorScheme='green'
            />
            <RawText>{`${formattedPercentage}%`}</RawText>
          </Flex>
        </Flex>

        {/* Cancel button */}
        {status === LimitOrderStatus.Open && (
          <Button
            variant='ghost-filled'
            colorScheme='red'
            width='100%'
            mt={2}
            onClick={handleCancel}
          >
            <Text translation='common.cancel' />
          </Button>
        )}
      </Flex>
    </Box>
  )
}
