import type { RenderProps } from '@chakra-ui/react/dist/types/toast/toast.types'
import type { CowSwapQuoteId } from '@shapeshiftoss/types'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { ActionIcon } from '../ActionIcon'

import { StandardToast } from '@/components/Toast/StandardToast'
import { useLocaleFormatter } from '@/hooks/useLocaleFormatter/useLocaleFormatter'
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
  const translate = useTranslate()
  const {
    number: { toCrypto },
  } = useLocaleFormatter()
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

  const title = useMemo(() => {
    if (!action) return undefined

    const isComplete = action.status === ActionStatus.Complete

    const sellAmountAndSymbol = toCrypto(
      isComplete
        ? action.limitOrderMetadata.executedSellAmountCryptoPrecision ??
            action.limitOrderMetadata.sellAmountCryptoPrecision
        : action.limitOrderMetadata.sellAmountCryptoPrecision,
      action.limitOrderMetadata.sellAsset.symbol,
      {
        maximumFractionDigits: 6,
        omitDecimalTrailingZeros: true,
      },
    )

    const buyAmountAndSymbol = toCrypto(
      isComplete
        ? action.limitOrderMetadata.executedBuyAmountCryptoPrecision ??
            action.limitOrderMetadata.buyAmountCryptoPrecision
        : action.limitOrderMetadata.buyAmountCryptoPrecision,
      action.limitOrderMetadata.buyAsset.symbol,
      {
        maximumFractionDigits: 6,
        omitDecimalTrailingZeros: true,
      },
    )

    return translate(limitOrderTitleTranslation, {
      sellAmountAndSymbol,
      buyAmountAndSymbol,
    })
  }, [action, limitOrderTitleTranslation, toCrypto, translate])

  if (!action || !icon || !title) return null

  return <StandardToast icon={icon} title={title} onClick={handleClick} onClose={onClose} />
}
