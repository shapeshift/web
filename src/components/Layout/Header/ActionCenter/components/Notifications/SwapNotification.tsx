import { Box, Flex, HStack, Stack } from '@chakra-ui/react'
import type { RenderProps } from '@chakra-ui/react/dist/types/toast/toast.types'
import { SwapStatus } from '@shapeshiftoss/swapper'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { getChainShortName } from '@shapeshiftoss/utils'
import { useMemo } from 'react'

import { ActionStatusIcon } from '../ActionStatusIcon'
import { NotificationWrapper } from './NotificationWrapper'

import { Amount } from '@/components/Amount/Amount'
import { AssetIconWithBadge } from '@/components/AssetIconWithBadge'
import type { TextPropTypes } from '@/components/Text/Text'
import { Text } from '@/components/Text/Text'
import { SwapDisplayType } from '@/state/slices/actionSlice/types'
import { selectSwapActionBySwapId } from '@/state/slices/selectors'
import { swapSlice } from '@/state/slices/swapSlice/swapSlice'
import { useAppSelector } from '@/state/store'

type SwapNotificationProps = {
  handleClick: () => void
  swapId: string
} & RenderProps

export const SwapNotification = ({ handleClick, swapId, onClose }: SwapNotificationProps) => {
  const swapsById = useAppSelector(swapSlice.selectors.selectSwapsById)

  const swap = useMemo(() => {
    if (!swapId) return undefined
    return swapsById[swapId]
  }, [swapId, swapsById])

  const action = useAppSelector(state => selectSwapActionBySwapId(state, { swapId }))

  const { displayType = SwapDisplayType.Swap } = action?.swapMetadata ?? {}

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
      sellChainShortName: (
        <Box display='inline' fontWeight='bold'>
          {getChainShortName(swap.sellAsset.chainId as KnownChainIds)}
        </Box>
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
      buyChainShortName: (
        <Box display='inline' fontWeight='bold'>
          {getChainShortName(swap.buyAsset.chainId as KnownChainIds)}
        </Box>
      ),
    }
  }, [swap])

  const swapTitleTranslation = useMemo(() => {
    const displayKey = displayType.toLowerCase()
    if (!swap) return `actionCenter.${displayKey}.processing`
    if (swap.isStreaming && swap.status === SwapStatus.Pending) return 'actionCenter.swap.streaming'
    if (swap.status === SwapStatus.Success) return `actionCenter.${displayKey}.complete`
    if (swap.status === SwapStatus.Failed) return `actionCenter.${displayKey}.failed`

    return `actionCenter.${displayKey}.processing`
  }, [displayType, swap])

  if (!swap) return null

  return (
    <NotificationWrapper handleClick={handleClick} onClose={onClose}>
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
            </Box>
          </HStack>
        </Flex>
      </Stack>
    </NotificationWrapper>
  )
}
