import { Box, Button, Flex, Progress } from '@chakra-ui/react'
import { type FC, useCallback } from 'react'
import { RawText, Text } from 'components/Text'

export interface LimitOrderCardProps {
  id: string
  buyAmount: number
  sellAmount: number
  buyAssetSymbol: string
  sellAssetSymbol: string
  expiry: number
  filledDecimalPercentage: number
  status: 'open' | 'filled' | 'cancelled'
}

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
          <RawText fontSize='xl'>{`${sellAmount.toLocaleString()} ${sellAssetSymbol}`}</RawText>
          <RawText fontSize='xl'>{`${buyAmount.toLocaleString()} ${buyAssetSymbol}`}</RawText>
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
        {status === 'open' && (
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
