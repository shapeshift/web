import { CloseIcon } from '@chakra-ui/icons'
import { Box, Button, Flex, HStack, Icon, Stack } from '@chakra-ui/react'
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

const toastHoverProps = {
  transform: 'scale(1.02)',
}

export const SwapNotification = ({ handleClick, status, id, onClose }: SwapNotificationProps) => {
  const swapsById = useAppSelector(swapSlice.selectors.selectSwapsById)

  const swap = useMemo(() => {
    if (!id) return undefined
    return swapsById[id]
  }, [id, swapsById])

  const iconColor = status === 'success' ? 'green.500' : 'red.500'

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
    <Box position='relative' _hover={toastHoverProps} transition='all 0.2s'>
      <Button
        variant='ghost'
        size='xs'
        onClick={onClose}
        position='absolute'
        top={'14px'}
        right={1}
        zIndex={1}
      >
        <Icon as={CloseIcon} boxSize={'10px'} />
      </Button>
      <Box
        onClick={handleClick}
        cursor='pointer'
        p={3}
        px={2}
        boxShadow='lg'
        width='100%'
        bg='background.surface.overlay.base'
        borderRadius='lg'
        position='relative'
      >
        <Stack spacing={3}>
          <Flex alignItems='center' justifyContent='space-between' pe={6}>
            <HStack spacing={2}>
              <Icon
                as={status === 'success' ? TbCircleCheckFilled : TbCircleXFilled}
                color={iconColor}
                boxSize={7}
              />

              <HStack spacing={3} alignItems='center' justifyContent='center' mx='2'>
                <HStack spacing={2}>
                  <AssetIcon assetId={swap.sellAsset.assetId} size='xs' />
                  <Stack spacing={0}>
                    <Amount.Crypto
                      value={sellAmount}
                      symbol={swap.sellAsset.symbol}
                      fontSize='sm'
                      fontWeight='semibold'
                      maximumFractionDigits={6}
                      omitDecimalTrailingZeros
                    />
                  </Stack>
                </HStack>

                <Icon as={TbArrowRight} color='text.subtle' boxSize={4} />

                <HStack spacing={2}>
                  <AssetIcon assetId={swap.buyAsset.assetId} size='xs' />
                  <Stack spacing={0}>
                    <Amount.Crypto
                      value={buyAmount}
                      symbol={swap.buyAsset.symbol}
                      fontSize='sm'
                      fontWeight='semibold'
                      maximumFractionDigits={6}
                      omitDecimalTrailingZeros
                    />
                  </Stack>
                </HStack>
              </HStack>
            </HStack>

            {swap.swapperName && (
              <Flex alignItems='center' gap={1}>
                {swap.isStreaming && (
                  <HStack spacing={1} justifyContent='center'>
                    <Icon as={StreamIcon} color={iconColor} boxSize={5} me={2} />
                  </HStack>
                )}

                <SwapperIcon size='xs' swapperName={swap.swapperName} />
              </Flex>
            )}
          </Flex>
        </Stack>
      </Box>
    </Box>
  )
}
