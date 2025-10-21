import type { RenderProps } from '@chakra-ui/react/dist/types/toast/toast.types'
import type { CowSwapQuoteId } from '@shapeshiftoss/types'
import { useMemo } from 'react'

import { ActionIcon } from '../ActionIcon'

import { Amount } from '@/components/Amount/Amount'
import { Text } from '@/components/Text'
import type { TextPropTypes } from '@/components/Text/Text'
import { StandardToast } from '@/components/Toast/StandardToast'
import { ActionStatus } from '@/state/slices/actionSlice/types'
import { selectWalletLimitOrderActionByCowSwapQuoteId } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type LimitOrderNotificationProps = {
  handleClick: () => void
  cowSwapQuoteId: CowSwapQuoteId
} & RenderProps

export const LimitOrderNotification = ({
  handleClick,
  cowSwapQuoteId,
  onClose,
}: LimitOrderNotificationProps) => {
  const action = useAppSelector(state =>
    selectWalletLimitOrderActionByCowSwapQuoteId(state, { cowSwapQuoteId }),
  )

  const limitOrderTitleTranslation = useMemo(() => {
    if (!action) return 'actionCenter.limitOrder.processing'
    if (action.status === ActionStatus.Open) return 'actionCenter.limitOrder.placed'
    if (action.status === ActionStatus.Complete) return 'actionCenter.limitOrder.complete'
    if (action.status === ActionStatus.Expired) return 'actionCenter.limitOrder.expired'
    if (action.status === ActionStatus.Cancelled) return 'actionCenter.limitOrder.cancelled'

    return 'actionCenter.limitOrder.placed'
  }, [action])

  const icon = useMemo(() => {
    if (!action) return undefined
    return (
      <ActionIcon
        assetId={action.limitOrderMetadata.sellAsset.assetId}
        secondaryAssetId={action.limitOrderMetadata.buyAsset.assetId}
        status={action.status}
      />
    )
  }, [action])

  const limitOrderNotificationTranslationComponents: TextPropTypes['components'] | undefined =
    useMemo(() => {
      if (!action) return

      const isComplete = action.status === ActionStatus.Complete

      return {
        sellAmountAndSymbol: (
          <Amount.Crypto
            value={
              isComplete
                ? action.limitOrderMetadata.executedSellAmountCryptoPrecision ??
                  action.limitOrderMetadata.sellAmountCryptoPrecision
                : action.limitOrderMetadata.sellAmountCryptoPrecision
            }
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
            value={
              isComplete
                ? action.limitOrderMetadata.executedBuyAmountCryptoPrecision ??
                  action.limitOrderMetadata.buyAmountCryptoPrecision
                : action.limitOrderMetadata.buyAmountCryptoPrecision
            }
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

  const title = useMemo(() => {
    if (!action) return undefined

    return (
      <Text
        fontSize='sm'
        letterSpacing='0.02em'
        translation={limitOrderTitleTranslation}
        components={limitOrderNotificationTranslationComponents}
      />
    )
  }, [action, limitOrderTitleTranslation, limitOrderNotificationTranslationComponents])

  if (!action || !icon || !title) return null

  return <StandardToast icon={icon} title={title} onClick={handleClick} onClose={onClose} />
}
