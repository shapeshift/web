import type { RenderProps } from '@chakra-ui/react/dist/types/toast/toast.types'
import { useMemo } from 'react'

import { ActionIcon } from '../ActionIcon'

import { Amount } from '@/components/Amount/Amount'
import { Text } from '@/components/Text'
import type { TextPropTypes } from '@/components/Text/Text'
import { StandardToast } from '@/components/Toast/StandardToast'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import type { ChainflipLendingAction } from '@/state/slices/actionSlice/types'
import { isChainflipLendingAction } from '@/state/slices/actionSlice/types'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type ChainflipLendingNotificationProps = {
  handleClick: () => void
  actionId: string
} & RenderProps

export const ChainflipLendingNotification = ({
  handleClick,
  actionId,
  onClose,
  status,
}: ChainflipLendingNotificationProps) => {
  const actionsById = useAppSelector(actionSlice.selectors.selectActionsById)

  const action = useMemo((): ChainflipLendingAction | undefined => {
    const maybeAction = actionsById[actionId]
    if (!maybeAction || !isChainflipLendingAction(maybeAction)) return undefined
    return maybeAction
  }, [actionsById, actionId])

  const asset = useAppSelector(state =>
    selectAssetById(state, action?.chainflipLendingMetadata?.assetId ?? ''),
  )

  const icon = useMemo(() => {
    if (!action || !asset) return undefined
    return <ActionIcon assetId={action.chainflipLendingMetadata.assetId} status={action.status} />
  }, [action, asset])

  const translationComponents = useMemo((): TextPropTypes['components'] | undefined => {
    if (!action || !asset) return undefined

    return {
      amountAndSymbol: (
        <Amount.Crypto
          value={action.chainflipLendingMetadata.amountCryptoPrecision}
          symbol={asset.symbol}
          fontSize='sm'
          fontWeight='bold'
          maximumFractionDigits={6}
          omitDecimalTrailingZeros
          display='inline'
        />
      ),
    }
  }, [action, asset])

  const title = useMemo(() => {
    if (!action || !translationComponents) return undefined

    return (
      <Text
        fontSize='sm'
        letterSpacing='0.02em'
        translation={[
          action.chainflipLendingMetadata.message,
          {
            amount: action.chainflipLendingMetadata.amountCryptoPrecision,
            symbol: asset?.symbol,
          },
        ]}
        components={translationComponents}
      />
    )
  }, [action, translationComponents, asset?.symbol])

  if (!action || !icon || !title) return null

  const toastStatus = status === 'loading' ? 'info' : status

  return (
    <StandardToast
      icon={icon}
      title={title}
      status={toastStatus}
      onClick={handleClick}
      onClose={onClose}
    />
  )
}
