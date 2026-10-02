import { Box } from '@chakra-ui/react'
import type { RenderProps } from '@chakra-ui/react/dist/types/toast/toast.types'
import { BigAmount } from '@shapeshiftoss/utils'
import { useMemo } from 'react'

import { ActionIcon } from '../ActionIcon'

import { Amount } from '@/components/Amount/Amount'
import { Text } from '@/components/Text'
import type { TextPropTypes } from '@/components/Text/Text'
import { StandardToast } from '@/components/Toast/StandardToast'
import { getArbitrumBridgeWithdrawMessageKey } from '@/hooks/useActionCenterSubscribers/arbitrumBridgeWithdrawAction'
import { useArbitrumClaimTimeText } from '@/hooks/useArbitrumClaimTimeText/useArbitrumClaimTimeText'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { selectArbitrumBridgeWithdrawActionById, selectAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export type ArbitrumBridgeWithdrawNotificationProps = {
  handleClick: () => void
  actionId: string
} & RenderProps

export const ArbitrumBridgeWithdrawNotification = ({
  handleClick,
  actionId,
  onClose,
}: ArbitrumBridgeWithdrawNotificationProps) => {
  const action = useAppSelector(state => selectArbitrumBridgeWithdrawActionById(state, actionId))
  const buyAsset = useAppSelector(state =>
    selectAssetById(state, action?.arbitrumBridgeMetadata.destinationAssetId ?? ''),
  )
  const timeText = useArbitrumClaimTimeText(action?.arbitrumBridgeMetadata.claimableAt)

  const icon = useMemo(() => {
    if (!action) return undefined
    return <ActionIcon assetId={action.arbitrumBridgeMetadata.assetId} status={action.status} />
  }, [action])

  const translationComponents = useMemo((): TextPropTypes['components'] | undefined => {
    if (!action || !buyAsset) return undefined

    const amountCryptoPrecision = bnOrZero(
      BigAmount.fromBaseUnit({
        value: action.arbitrumBridgeMetadata.amountCryptoBaseUnit,
        precision: buyAsset.precision,
      }).toPrecision(),
    )
      .decimalPlaces(8)
      .toString()

    return {
      amountAndSymbol: (
        <Amount.Crypto
          value={amountCryptoPrecision}
          symbol={buyAsset.symbol}
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
  }, [action, buyAsset, timeText])

  const title = useMemo(() => {
    if (!action || !translationComponents) return undefined
    return (
      <Text
        fontSize='sm'
        letterSpacing='0.02em'
        translation={getArbitrumBridgeWithdrawMessageKey(action.status)}
        components={translationComponents}
      />
    )
  }, [action, translationComponents])

  if (!icon || !title) return null

  return <StandardToast icon={icon} title={title} onClick={handleClick} onClose={onClose} />
}
