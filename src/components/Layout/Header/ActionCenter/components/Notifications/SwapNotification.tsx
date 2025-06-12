import { Box, Flex, HStack, Icon, Stack, Text, useColorModeValue } from '@chakra-ui/react'
import type { RenderProps } from '@chakra-ui/react/dist/types/toast/toast.types'
import { fromBaseUnit } from '@shapeshiftoss/utils'
import { useMemo } from 'react'
import { TbArrowRight, TbCircleCheckFilled, TbCircleXFilled } from 'react-icons/tb'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { StreamIcon } from '@/components/Icons/Stream'
import { SwapperIcon } from '@/components/MultiHopTrade/components/TradeInput/components/SwapperIcon/SwapperIcon'
import { swapSlice } from '@/state/slices/swapSlice/swapSlice'
import { useAppSelector } from '@/state/store'

type SwapNotificationProps = {
  handleClick: () => void
} & RenderProps

export const SwapNotification = ({ handleClick, status, title, id }: SwapNotificationProps) => {
  const swapsById = useAppSelector(swapSlice.selectors.selectSwapsById)

  const swap = useMemo(() => {
    if (!id) return undefined
    return swapsById[id]
  }, [id, swapsById])

  const bgColor = useColorModeValue(
    status === 'success' ? 'green.50' : 'red.50',
    status === 'success' ? 'green.900' : 'red.900',
  )

  const borderColor = useColorModeValue(
    status === 'success' ? 'green.200' : 'red.200',
    status === 'success' ? 'green.600' : 'red.600',
  )

  const iconColor = status === 'success' ? 'green.500' : 'red.500'
  const textColor = useColorModeValue('gray.800', 'white')

  const sellAmount = useMemo(() => {
    if (!swap) return ''
    return fromBaseUnit(swap.sellAmountCryptoBaseUnit, swap.sellAsset.precision)
  }, [swap])

  const buyAmount = useMemo(() => {
    if (!swap) return ''
    return fromBaseUnit(swap.buyAmountCryptoBaseUnit, swap.buyAsset.precision)
  }, [swap])

  if (!swap) return null

  return (
    <Box
      onClick={handleClick}
      cursor='pointer'
      bg={bgColor}
      border='1px solid'
      borderColor={borderColor}
      borderRadius='xl'
      p={4}
      boxShadow='lg'
      transition='all 0.2s'
      width='100%'
      maxWidth='400px'
    >
      <Stack spacing={3}>
        {/* Header with status and swapper */}
        <Flex alignItems='center' justifyContent='space-between'>
          <HStack spacing={2}>
            <Icon
              as={status === 'success' ? TbCircleCheckFilled : TbCircleXFilled}
              color={iconColor}
              boxSize={5}
            />
            <Text fontSize='sm' fontWeight='semibold' color={textColor}>
              {title}
            </Text>
          </HStack>

          {swap.swapperName && (
            <Flex alignItems='center' gap={1}>
              <SwapperIcon size='xs' swapperName={swap.swapperName} />
            </Flex>
          )}
        </Flex>

        <HStack spacing={3} alignItems='center' justifyContent='center'>
          <HStack spacing={2}>
            <AssetIcon assetId={swap.sellAsset.assetId} size='sm' />
            <Stack spacing={0}>
              <Amount.Crypto
                value={sellAmount}
                symbol={swap.sellAsset.symbol}
                fontSize='sm'
                fontWeight='semibold'
                color={textColor}
                maximumFractionDigits={6}
                omitDecimalTrailingZeros
              />
            </Stack>
          </HStack>

          <Icon as={TbArrowRight} color='text.subtle' boxSize={4} />

          <HStack spacing={2}>
            <AssetIcon assetId={swap.buyAsset.assetId} size='sm' />
            <Stack spacing={0}>
              <Amount.Crypto
                value={buyAmount}
                symbol={swap.buyAsset.symbol}
                fontSize='sm'
                fontWeight='semibold'
                color={textColor}
                maximumFractionDigits={6}
                omitDecimalTrailingZeros
              />
            </Stack>
          </HStack>
        </HStack>

        {swap.isStreaming && (
          <HStack spacing={1} justifyContent='center'>
            <Icon as={StreamIcon} color='blue.400' boxSize={3} />
          </HStack>
        )}
      </Stack>
    </Box>
  )
}
