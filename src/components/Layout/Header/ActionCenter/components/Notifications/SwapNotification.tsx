import type { RenderProps } from '@chakra-ui/react/dist/types/toast/toast.types'
import { SwapperName } from '@shapeshiftoss/swapper'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { getChainShortName } from '@shapeshiftoss/utils'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { ActionIcon } from '../ActionIcon'

import { StandardToast } from '@/components/Toast/StandardToast'
import { useActualBuyAmountCryptoPrecision } from '@/hooks/useActualBuyAmountCryptoPrecision'
import { useLocaleFormatter } from '@/hooks/useLocaleFormatter/useLocaleFormatter'
import { ActionStatus } from '@/state/slices/actionSlice/types'
import { selectSwapActionBySwapId, selectWalletSwapsById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type SwapNotificationProps = {
  handleClick: () => void
  swapId: string
} & RenderProps

export const SwapNotification = ({ handleClick, swapId, onClose }: SwapNotificationProps) => {
  const translate = useTranslate()
  const {
    number: { toCrypto },
  } = useLocaleFormatter()
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

  const title = useMemo(() => {
    if (!swap) return undefined

    const sellAmountAndSymbol = toCrypto(swap.sellAmountCryptoPrecision, swap.sellAsset.symbol, {
      maximumFractionDigits: 6,
      omitDecimalTrailingZeros: true,
    })

    const buyAmountAndSymbol = toCrypto(
      actualBuyAmountCryptoPrecision ?? swap.expectedBuyAmountCryptoPrecision,
      swap.buyAsset.symbol,
      {
        maximumFractionDigits: 6,
        omitDecimalTrailingZeros: true,
      },
    )

    const sellChainShortName = getChainShortName(swap.sellAsset.chainId as KnownChainIds)
    const buyChainShortName = getChainShortName(swap.buyAsset.chainId as KnownChainIds)

    return translate(swapTitleTranslation, {
      sellAmountAndSymbol,
      sellChainShortName,
      buyAmountAndSymbol,
      buyChainShortName,
    })
  }, [swap, swapTitleTranslation, actualBuyAmountCryptoPrecision, toCrypto, translate])

  if (!swap || !icon || !title) return null

  return <StandardToast icon={icon} title={title} onClick={handleClick} onClose={onClose} />
}
