import { CloseIcon } from '@chakra-ui/icons'
import { Box, Button, Flex, HStack, Icon, Stack, useColorModeValue } from '@chakra-ui/react'
import type { RenderProps } from '@chakra-ui/react/dist/types/toast/toast.types'
import { SwapStatus } from '@shapeshiftoss/swapper'
import dayjs from 'dayjs'
import { useMemo } from 'react'

import { ActionStatusIcon } from '../ActionStatusIcon'

import { Amount } from '@/components/Amount/Amount'
import { AssetIconWithBadge } from '@/components/AssetIconWithBadge'
import { SwapperIcons } from '@/components/MultiHopTrade/components/SwapperIcons'
import type { TextPropTypes } from '@/components/Text/Text'
import { RawText, Text } from '@/components/Text/Text'
import { selectSwapActionBySwapId } from '@/state/slices/selectors'
import { swapSlice } from '@/state/slices/swapSlice/swapSlice'
import { useAppSelector } from '@/state/store'

type SwapNotificationProps = {
  handleClick: () => void
  swapId: string
} & RenderProps

const toastHoverProps = {
  transform: 'translateY(-2px)',
}

const divider = <RawText color='text.subtle'>•</RawText>

export const SwapNotification = ({ handleClick, swapId, onClose }: SwapNotificationProps) => {
  const swapsById = useAppSelector(swapSlice.selectors.selectSwapsById)
  const crossBgColor = useColorModeValue('gray.850', 'white')
  const crossColor = useColorModeValue('white', 'gray.850')

  const buttonHoverProps = useMemo(
    () => ({
      opacity: 0.8,
      bg: crossBgColor,
      color: crossColor,
    }),
    [crossBgColor, crossColor],
  )

  const swap = useMemo(() => {
    if (!swapId) return undefined
    return swapsById[swapId]
  }, [swapId, swapsById])

  const action = useAppSelector(state => selectSwapActionBySwapId(state, { swapId }))

  const swapNotificationTranslationComponents: TextPropTypes['components'] = useMemo(() => {
    if (!swap) return

    return {
      sellAmountAndSymbol: (
        <Amount.Crypto
          value={swap.sellAmountCryptoPrecision}
          symbol={swap.sellAsset.symbol}
          fontSize='sm'
          fontWeight='bold'
          maximumFractionDigits={6}
          omitDecimalTrailingZeros
          display='inline'
        />
      ),
      buyAmountAndSymbol: (
        <Amount.Crypto
          value={swap.expectedBuyAmountCryptoPrecision}
          symbol={swap.buyAsset.symbol}
          fontSize='sm'
          fontWeight='bold'
          maximumFractionDigits={6}
          omitDecimalTrailingZeros
          display='inline'
        />
      ),
    }
  }, [swap])

  const swapTitleTranslation = useMemo(() => {
    if (!swap) return 'notificationCenter.swap.processing'
    if (swap.isStreaming && swap.status === SwapStatus.Pending)
      return 'notificationCenter.swap.streaming'
    if (swap.status === SwapStatus.Success) return 'notificationCenter.swap.complete'
    if (swap.status === SwapStatus.Failed) return 'notificationCenter.swap.failed'

    return 'notificationCenter.swap.processing'
  }, [swap])

  const formattedDate = useMemo(() => {
    const now = dayjs()
    const notificationDate = dayjs(action?.createdAt)
    const sevenDaysAgo = now.subtract(7, 'day')

    if (notificationDate.isAfter(sevenDaysAgo)) {
      return notificationDate.fromNow()
    } else {
      return notificationDate.toDate().toLocaleString()
    }
  }, [action?.createdAt])

  if (!swap) return null

  return (
    <Box position='relative' _hover={toastHoverProps} transition='all 0.2s'>
      <Button
        size='xs'
        onClick={onClose}
        position='absolute'
        top={0}
        right={0}
        zIndex={1}
        backgroundColor={crossBgColor}
        borderRadius='full'
        _hover={buttonHoverProps}
        transform='translate(20%, -20%)'
      >
        <Icon as={CloseIcon} boxSize={'10px'} color={crossColor} />
      </Button>
      <Box
        onClick={handleClick}
        cursor='pointer'
        p={4}
        boxShadow='lg'
        width='100%'
        bg='background.surface.overlay.base'
        borderRadius='20'
        position='relative'
      >
        <Stack spacing={3}>
          <Flex alignItems='center' justifyContent='space-between' pe={6}>
            <HStack spacing={2}>
              <AssetIconWithBadge
                assetId={swap?.sellAsset.assetId}
                secondaryAssetId={swap?.buyAsset.assetId}
                size='md'
              >
                <ActionStatusIcon status={action?.status} />
              </AssetIconWithBadge>

              <Box ml={2}>
                <Text
                  flex={1}
                  fontSize='sm'
                  letterSpacing='0.02em'
                  translation={swapTitleTranslation}
                  components={swapNotificationTranslationComponents}
                />
                <HStack fontSize='sm' color='text.subtle' divider={divider} gap={1}>
                  <RawText>{formattedDate}</RawText>

                  {swap.swapperName && (
                    <RawText fontSize='xs'>
                      <SwapperIcons swapperName={swap.swapperName} swapSource={undefined} />
                    </RawText>
                  )}
                </HStack>
              </Box>
            </HStack>
          </Flex>
        </Stack>
      </Box>
    </Box>
  )
}
