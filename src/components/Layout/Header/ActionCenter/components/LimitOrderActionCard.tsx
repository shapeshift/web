import { useDisclosure } from '@chakra-ui/react'
import type { Order } from '@shapeshiftoss/types'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useMemo } from 'react'

import { ActionCard } from './ActionCard'
import { ActionStatusIcon } from './ActionStatusIcon'
import { ActionStatusTag } from './ActionStatusTag'
import { LimitOrderDetails } from './Details/LimitOrderDetails'

import { Amount } from '@/components/Amount/Amount'
import { AssetIconWithBadge } from '@/components/AssetIconWithBadge'
import type { OrderToCancel } from '@/components/MultiHopTrade/components/LimitOrder/types'
import type { TextPropTypes } from '@/components/Text/Text'
import { Text } from '@/components/Text/Text'
import { formatSmartDate } from '@/lib/utils/time'
import type { LimitOrderAction } from '@/state/slices/actionSlice/types'
import { ActionStatus } from '@/state/slices/actionSlice/types'

dayjs.extend(relativeTime)

type NotificationCardProps = {
  isCollapsable?: boolean
  defaultIsOpen?: boolean
  onCancelOrder: (order: OrderToCancel) => void
  order: Order
  action: LimitOrderAction
}

export const LimitOrderActionCard = ({
  isCollapsable = true,
  defaultIsOpen = false,
  onCancelOrder,
  order,
  action,
}: NotificationCardProps) => {
  const { isOpen, onToggle } = useDisclosure({ defaultIsOpen })
  const { updatedAt, status, type } = action

  const formattedDate = useMemo(() => {
    return formatSmartDate(updatedAt)
  }, [updatedAt])

  const limitOrderActionTranslationComponents: TextPropTypes['components'] = useMemo(() => {
    if (!action) return

    if (action.status === ActionStatus.Complete) {
      return {
        sellAmountAndSymbol: (
          <Amount.Crypto
            value={action.limitOrderMetadata.executedSellAmountCryptoPrecision}
            symbol={action.limitOrderMetadata.sellAsset.symbol}
            fontSize='sm'
            fontWeight='bold'
            maximumFractionDigits={6}
            omitDecimalTrailingZeros
            display='inline'
          />
        ),
        buyAmountAndSymbol: (
          <Amount.Crypto
            value={action.limitOrderMetadata.executedBuyAmountCryptoPrecision}
            symbol={action.limitOrderMetadata.buyAsset.symbol}
            fontSize='sm'
            fontWeight='bold'
            maximumFractionDigits={6}
            omitDecimalTrailingZeros
            display='inline'
          />
        ),
      }
    }

    return {
      sellAmountAndSymbol: (
        <Amount.Crypto
          value={action.limitOrderMetadata.sellAmountCryptoPrecision}
          symbol={action.limitOrderMetadata.sellAsset.symbol}
          fontSize='sm'
          fontWeight='bold'
          maximumFractionDigits={6}
          omitDecimalTrailingZeros
          display='inline'
        />
      ),
      buyAmountAndSymbol: (
        <Amount.Crypto
          value={action.limitOrderMetadata.buyAmountCryptoPrecision}
          symbol={action.limitOrderMetadata.buyAsset.symbol}
          fontSize='sm'
          fontWeight='bold'
          maximumFractionDigits={6}
          omitDecimalTrailingZeros
          display='inline'
        />
      ),
    }
  }, [action])

  const limitOrderTitleTranslation = useMemo(() => {
    if (!action) return 'actionCenter.limitOrder.processing'
    if (action.status === ActionStatus.Open) return 'actionCenter.limitOrder.placed'
    if (action.status === ActionStatus.Complete) return 'actionCenter.limitOrder.complete'
    if (action.status === ActionStatus.Expired) return 'actionCenter.limitOrder.expired'
    if (action.status === ActionStatus.Cancelled) return 'actionCenter.limitOrder.cancelled'

    return 'actionCenter.limitOrder.placed'
  }, [action])

  const icon = useMemo(() => {
    return (
      <AssetIconWithBadge
        assetId={action.limitOrderMetadata.buyAsset.assetId}
        secondaryAssetId={action.limitOrderMetadata.sellAsset.assetId}
        size='md'
      >
        <ActionStatusIcon status={status} />
      </AssetIconWithBadge>
    )
  }, [
    action.limitOrderMetadata.buyAsset.assetId,
    action.limitOrderMetadata.sellAsset.assetId,
    status,
  ])

  const description = useMemo(() => {
    return (
      <Text
        fontSize='sm'
        translation={limitOrderTitleTranslation}
        components={limitOrderActionTranslationComponents}
      />
    )
  }, [limitOrderTitleTranslation, limitOrderActionTranslationComponents])

  const footer = useMemo(() => {
    return (
      <>
        <ActionStatusTag status={status} />
      </>
    )
  }, [status])

  return (
    <ActionCard
      typeTitle={type}
      formattedDate={formattedDate}
      isCollapsable={isCollapsable}
      isOpen={isOpen}
      onToggle={onToggle}
      description={description}
      icon={icon}
      footer={footer}
    >
      <LimitOrderDetails action={action} order={order} onCancelOrder={onCancelOrder} />
    </ActionCard>
  )
}
