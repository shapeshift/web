import { Box } from '@chakra-ui/react'
import type { RenderProps } from '@chakra-ui/react/dist/types/toast/toast.types'
import { SwapperName } from '@shapeshiftoss/swapper'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { getChainShortName } from '@shapeshiftoss/utils'
import { useMemo } from 'react'

import { ActionIcon } from '../ActionIcon'

import { Amount } from '@/components/Amount/Amount'
import { Text } from '@/components/Text'
import type { TextPropTypes } from '@/components/Text/Text'
import { StandardToast } from '@/components/Toast/StandardToast'
import { useActualBuyAmountCryptoPrecision } from '@/hooks/useActualBuyAmountCryptoPrecision'
import { ActionStatus } from '@/state/slices/actionSlice/types'
import { selectSwapActionBySwapId, selectWalletSwapsById } from '@/state/slices/selectors'
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

  const action = useAppSelector(state => selectSwapActionBySwapId(state, { swapId }))

  const swapTitleTranslation = useMemo(() => {
    if (!action || !swap) return 'actionCenter.swap.processing'

    const { status } = action

    if (swap.swapperName === SwapperName.ArbitrumBridge) {
      if (status === ActionStatus.Complete) return 'actionCenter.bridge.complete'
      if (status === ActionStatus.Failed) return 'actionCenter.bridge.failed'
      if (status === ActionStatus.Initiated) return 'actionCenter.bridge.initiated'

      return 'actionCenter.bridge.processing'
    }

    if (swap?.isStreaming && status === ActionStatus.Pending) return 'actionCenter.swap.streaming'
    if (status === ActionStatus.Complete) return 'actionCenter.swap.complete'
    if (status === ActionStatus.Failed) return 'actionCenter.swap.failed'

    return 'actionCenter.swap.processing'
  }, [action, swap])

  const icon = useMemo(() => {
    if (!swap || !action) return undefined
    return (
      <ActionIcon
        assetId={swap.sellAsset.assetId}
        secondaryAssetId={swap.buyAsset.assetId}
        status={action.status}
      />
    )
  }, [swap, action])

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
    }
  }, [swap, actualBuyAmountCryptoPrecision])

  const title = useMemo(() => {
    if (!swap) return undefined

    return (
      <Text
        fontSize='sm'
        letterSpacing='0.02em'
        translation={swapTitleTranslation}
        components={swapNotificationTranslationComponents}
      />
    )
  }, [swap, swapTitleTranslation, swapNotificationTranslationComponents])

  if (!swap || !icon || !title) return null

  return <StandardToast icon={icon} title={title} onClick={handleClick} onClose={onClose} />
}
