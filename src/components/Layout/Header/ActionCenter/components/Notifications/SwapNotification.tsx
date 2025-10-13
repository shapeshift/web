import { Box, Flex, HStack, Stack } from '@chakra-ui/react'
import type { RenderProps } from '@chakra-ui/react/dist/types/toast/toast.types'
import { SwapperName } from '@shapeshiftoss/swapper'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { getChainShortName } from '@shapeshiftoss/utils'
import { useMemo } from 'react'

import { ActionStatusIcon } from '../ActionStatusIcon'
import { NotificationWrapper } from './NotificationWrapper'

import { Amount } from '@/components/Amount/Amount'
import { AssetIconWithBadge } from '@/components/AssetIconWithBadge'
import type { TextPropTypes } from '@/components/Text/Text'
import { Text } from '@/components/Text/Text'
import { useActualBuyAmountCryptoPrecision } from '@/hooks/useActualBuyAmountCryptoPrecision'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { formatSecondsToDuration } from '@/lib/utils/time'
import { ActionStatus, isArbitrumBridgeWithdrawAction } from '@/state/slices/actionSlice/types'
import {
  selectArbitrumBridgeWithdrawActionByWithdrawTxHash,
  selectSwapActionBySwapId,
  selectWalletSwapsById,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type SwapNotificationProps = {
  handleClick: () => void
  swapId: string
} & RenderProps

export const SwapNotification = ({ handleClick, swapId, onClose }: SwapNotificationProps) => {
  const swapsById = useAppSelector(selectWalletSwapsById)

  const swap = useMemo(() => {
    if (!swapId) return undefined
    return swapsById[swapId]
  }, [swapId, swapsById])

  const actualBuyAmountCryptoPrecision = useActualBuyAmountCryptoPrecision(swapId)

  const swapAction = useAppSelector(state => selectSwapActionBySwapId(state, { swapId }))

  // For ArbitrumBridge swaps, look up the corresponding ArbitrumBridge action by withdrawTxHash
  const withdrawTxHash = useMemo(() => {
    return swap?.swapperName === SwapperName.ArbitrumBridge ? swap?.sellTxHash : undefined
  }, [swap?.swapperName, swap?.sellTxHash])

  const maybeArbitrumBridgeAction = useAppSelector(state =>
    withdrawTxHash
      ? selectArbitrumBridgeWithdrawActionByWithdrawTxHash(state, withdrawTxHash)
      : undefined,
  )

  // Use ArbitrumBridge action for ArbitrumBridge swaps, otherwise use swap action
  const action =
    swap?.swapperName === SwapperName.ArbitrumBridge ? maybeArbitrumBridgeAction : swapAction

  const maybeArbitrumBridgeSpecificComponents = useMemo((): Partial<
    TextPropTypes['components']
  > => {
    if (
      !swap ||
      swap.swapperName !== SwapperName.ArbitrumBridge ||
      !action ||
      !isArbitrumBridgeWithdrawAction(action)
    ) {
      return {}
    }

    const buyAmountCryptoPrecision = bnOrZero(
      actualBuyAmountCryptoPrecision ?? swap.expectedBuyAmountCryptoPrecision,
    )
      .decimalPlaces(8)
      .toString()

    const timeRemaining =
      action.arbitrumBridgeMetadata.claimDetails?.timeRemainingSeconds ??
      action.arbitrumBridgeMetadata.timeRemainingSeconds
    const timeDisplay =
      timeRemaining && timeRemaining > 0 ? formatSecondsToDuration(timeRemaining) : null
    const timeText = timeDisplay ? `in ${timeDisplay}` : 'Available'

    return {
      amountAndSymbol: (
        <Amount.Crypto
          value={buyAmountCryptoPrecision}
          symbol={swap.buyAsset.symbol}
          fontSize='sm'
          fontWeight='bold'
          maximumFractionDigits={8}
          omitDecimalTrailingZeros
          display='inline'
        />
      ),
      timeText: (
        <Box display='inline' fontWeight='bold'>
          {timeText}
        </Box>
      ),
    }
  }, [swap, actualBuyAmountCryptoPrecision, action])

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
          value={actualBuyAmountCryptoPrecision ?? swap.expectedBuyAmountCryptoPrecision}
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
      ...maybeArbitrumBridgeSpecificComponents,
    }
  }, [swap, actualBuyAmountCryptoPrecision, maybeArbitrumBridgeSpecificComponents])

  const swapTitleTranslation = useMemo(() => {
    if (!action || !swap) return 'actionCenter.swap.processing'

    const { status } = action

    if (swap.swapperName === SwapperName.ArbitrumBridge) {
      if (status === ActionStatus.Complete) return 'actionCenter.bridge.complete'
      if (status === ActionStatus.Failed) return 'actionCenter.bridge.failed'
      if (status === ActionStatus.Initiated) {
        return isArbitrumBridgeWithdrawAction(action)
          ? 'actionCenter.bridge.pendingWithdraw'
          : 'actionCenter.bridge.initiated'
      }

      return 'actionCenter.bridge.processing'
    }

    if (swap?.isStreaming && status === ActionStatus.Pending) return 'actionCenter.swap.streaming'
    if (status === ActionStatus.Complete) return 'actionCenter.swap.complete'
    if (status === ActionStatus.Failed) return 'actionCenter.swap.failed'

    return 'actionCenter.swap.processing'
  }, [action, swap])

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
