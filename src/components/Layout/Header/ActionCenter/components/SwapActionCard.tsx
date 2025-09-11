import { Box, useDisclosure } from '@chakra-ui/react'
import { SwapperName } from '@shapeshiftoss/swapper'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { getChainShortName } from '@shapeshiftoss/utils'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useMemo } from 'react'

import { ActionCard } from './ActionCard'
import { ActionStatusIcon } from './ActionStatusIcon'
import { ActionStatusTag } from './ActionStatusTag'
import { SwapDetails } from './Details/SwapDetails'

import { Amount } from '@/components/Amount/Amount'
import { AssetIconWithBadge } from '@/components/AssetIconWithBadge'
import { HoverTooltip } from '@/components/HoverTooltip/HoverTooltip'
import { SwapperIcons } from '@/components/MultiHopTrade/components/SwapperIcons'
import { RawText } from '@/components/Text'
import type { TextPropTypes } from '@/components/Text/Text'
import { Text } from '@/components/Text/Text'
import { useActualBuyAmountCryptoPrecision } from '@/hooks/useActualBuyAmountCryptoPrecision'
import { formatSmartDate } from '@/lib/utils/time'
import type { SwapAction } from '@/state/slices/actionSlice/types'
import { ActionStatus, GenericTransactionDisplayType } from '@/state/slices/actionSlice/types'
import { swapSlice } from '@/state/slices/swapSlice/swapSlice'
import { useAppSelector } from '@/state/store'

dayjs.extend(relativeTime)

type SwapActionCardProps = {
  action: SwapAction
  isCollapsable?: boolean
}

export const SwapActionCard = ({ action, isCollapsable = false }: SwapActionCardProps) => {
  const swapsById = useAppSelector(swapSlice.selectors.selectSwapsById)

  const formattedDate = useMemo(() => {
    return formatSmartDate(action.updatedAt)
  }, [action.updatedAt])

  const swap = useMemo(() => {
    return swapsById[action.swapMetadata.swapId]
  }, [action, swapsById])

  const actualBuyAmountCryptoPrecision = useActualBuyAmountCryptoPrecision(
    action.swapMetadata.swapId,
  )

  const isArbitrumBridge = useMemo(() => swap?.swapperName === SwapperName.ArbitrumBridge, [swap])

  const { isOpen, onToggle } = useDisclosure({
    defaultIsOpen:
      action.status === ActionStatus.Pending && Boolean(swap?.isStreaming || swap?.txLink),
  })

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
    const { status } = action
    if (isArbitrumBridge) {
      if (status === ActionStatus.Complete) return 'actionCenter.bridge.complete'
      if (status === ActionStatus.Failed) return 'actionCenter.bridge.failed'
      if (status === ActionStatus.Initiated) return 'actionCenter.bridge.initiated'

      return 'actionCenter.bridge.processing'
    }

    if (swap?.isStreaming && status === ActionStatus.Pending) return 'actionCenter.swap.streaming'
    if (status === ActionStatus.Complete) return 'actionCenter.swap.complete'
    if (status === ActionStatus.Failed) return 'actionCenter.swap.failed'
    if (status === ActionStatus.AwaitingApproval) return 'actionCenter.swap.awaitingApproval'
    if (status === ActionStatus.AwaitingSwap) return 'actionCenter.swap.awaitingSwap'

    return 'actionCenter.swap.processing'
  }, [action, isArbitrumBridge, swap?.isStreaming])

  const icon = useMemo(() => {
    return (
      <AssetIconWithBadge
        assetId={swap?.sellAsset.assetId}
        secondaryAssetId={swap?.buyAsset.assetId}
        size='md'
      >
        <ActionStatusIcon status={action.status} />
      </AssetIconWithBadge>
    )
  }, [swap, action.status])

  const description = useMemo(() => {
    return (
      <Text fontSize='sm' translation={title} components={swapNotificationTranslationComponents} />
    )
  }, [title, swapNotificationTranslationComponents])

  const footer = useMemo(() => {
    return (
      <>
        <ActionStatusTag status={action.status} />
        {swap?.swapperName && (
          <RawText>
            <HoverTooltip label={swap.swapperName}>
              <SwapperIcons swapperName={swap.swapperName} swapSource={undefined} />
            </HoverTooltip>
          </RawText>
        )}
      </>
    )
  }, [action.status, swap?.swapperName])

  if (!swap) return null

  return (
    <ActionCard
      displayType={isArbitrumBridge ? GenericTransactionDisplayType.Bridge : undefined}
      type={action.type}
      formattedDate={formattedDate}
      isCollapsable={isCollapsable}
      isOpen={isOpen}
      onToggle={onToggle}
      footer={footer}
      description={description}
      icon={icon}
    >
      <SwapDetails txLink={swap?.txLink} swap={swap} action={action} />
    </ActionCard>
  )
}
