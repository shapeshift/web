import { useDisclosure } from '@chakra-ui/react'
import { SwapStatus } from '@shapeshiftoss/swapper'
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
import { formatSmartDate } from '@/lib/utils/time'
import type { SwapAction } from '@/state/slices/actionSlice/types'
import { ActionStatus } from '@/state/slices/actionSlice/types'
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

  const title = useMemo(() => {
    if (!swap) return 'actionCenter.swap.processing'
    if (swap.isStreaming && swap.status === SwapStatus.Pending) return 'actionCenter.swap.streaming'
    if (swap.status === SwapStatus.Success) return 'actionCenter.swap.complete'
    if (swap.status === SwapStatus.Failed) return 'actionCenter.swap.failed'

    return 'actionCenter.swap.processing'
  }, [swap])

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

  return (
    <ActionCard
      type={action.type}
      formattedDate={formattedDate}
      isCollapsable={isCollapsable}
      isOpen={isOpen}
      onToggle={onToggle}
      footer={footer}
      description={description}
      icon={icon}
    >
      <SwapDetails txLink={swap?.txLink} swap={swap} />
    </ActionCard>
  )
}
