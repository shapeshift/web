import type { RenderProps } from '@chakra-ui/react/dist/types/toast/toast.types'
import { useMemo } from 'react'

import { ActionIcon } from '../ActionIcon'

import { Amount } from '@/components/Amount/Amount'
import { Text } from '@/components/Text'
import type { TextPropTypes } from '@/components/Text/Text'
import { StandardToast } from '@/components/Toast/StandardToast'
import { firstFourLastFour } from '@/lib/utils'
import {
  selectAssetById,
  selectWalletGenericTransactionActionsSorted,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export type GenericTransactionNotificationProps = {
  handleClick: () => void
  actionId: string
} & RenderProps

export const GenericTransactionNotification = ({
  handleClick,
  actionId,
  onClose,
}: GenericTransactionNotificationProps) => {
  const actions = useAppSelector(selectWalletGenericTransactionActionsSorted)
  const action = useMemo(() => actions.find(action => action.id === actionId), [actions, actionId])
  const asset = useAppSelector(state =>
    selectAssetById(state, action?.transactionMetadata?.assetId ?? ''),
  )

  const icon = useMemo(() => {
    if (!action) return undefined
    return <ActionIcon assetId={action.transactionMetadata.assetId} status={action.status} />
  }, [action])

  const translationComponents = useMemo((): TextPropTypes['components'] | undefined => {
    if (!action || !asset) return undefined

    return {
      amountAndSymbol: (
        <Amount.Crypto
          value={action.transactionMetadata.amountCryptoPrecision}
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

  const translationArgs = useMemo(() => {
    if (!action || !asset) return undefined
    return [
      action.transactionMetadata.message,
      {
        amount: action.transactionMetadata.amountCryptoPrecision,
        symbol: asset.symbol,
        newAddress: firstFourLastFour(action.transactionMetadata.newAddress ?? ''),
      },
    ] as [string, Record<string, string | number>]
  }, [action, asset])

  const title = useMemo(() => {
    if (!action || !translationComponents || !translationArgs) return undefined
    return (
      <Text
        fontSize='sm'
        letterSpacing='0.02em'
        translation={translationArgs}
        components={translationComponents}
      />
    )
  }, [action, translationComponents, translationArgs])

  if (!action || !icon || !title) return null

  return <StandardToast icon={icon} title={title} onClick={handleClick} onClose={onClose} />
}
