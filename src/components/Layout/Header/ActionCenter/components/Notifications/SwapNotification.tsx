import { Box } from '@chakra-ui/react'
import type { RenderProps } from '@chakra-ui/react/dist/types/toast/toast.types'
import { ethChainId } from '@shapeshiftoss/caip'
import { SwapperName } from '@shapeshiftoss/swapper'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { getChainShortName } from '@shapeshiftoss/utils'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { ActionIcon } from '../ActionIcon'

import { Amount } from '@/components/Amount/Amount'
import type { TextPropTypes } from '@/components/Text/Text'
import { StandardToast } from '@/components/Toast/StandardToast'
import { useActualBuyAmountCryptoPrecision } from '@/hooks/useActualBuyAmountCryptoPrecision'
import { useLocaleFormatter } from '@/hooks/useLocaleFormatter/useLocaleFormatter'
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

  const swapTitleTranslation = useMemo(() => {
    if (!action || !swap) return 'actionCenter.swap.processing'

    const { status } = action

    if (swap.swapperName === SwapperName.ArbitrumBridge && swap.buyAsset.chainId === ethChainId) {
      if (status === ActionStatus.Complete) return 'actionCenter.bridge.initiated'
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

    // For ArbitrumBridge withdrawals, include the extra components
    const extraComponents =
      swap.swapperName === SwapperName.ArbitrumBridge && swap.buyAsset.chainId === ethChainId
        ? maybeArbitrumBridgeSpecificComponents
        : {}

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
      ...extraComponents,
    })
  }, [
    swap,
    swapTitleTranslation,
    actualBuyAmountCryptoPrecision,
    toCrypto,
    translate,
    maybeArbitrumBridgeSpecificComponents,
  ])

  if (!swap || !icon || !title) return null

  return <StandardToast icon={icon} title={title} onClick={handleClick} onClose={onClose} />
}
