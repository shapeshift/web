import type { RenderProps } from '@chakra-ui/react/dist/types/toast/toast.types'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { ActionIcon } from '../ActionIcon'

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
  const translate = useTranslate()
  const actions = useAppSelector(selectWalletGenericTransactionActionsSorted)
  const action = useMemo(() => actions.find(action => action.id === actionId), [actions, actionId])
  const asset = useAppSelector(state =>
    selectAssetById(state, action?.transactionMetadata?.assetId ?? ''),
  )

  const icon = useMemo(() => {
    if (!action) return undefined
    return <ActionIcon assetId={action.transactionMetadata.assetId} status={action.status} />
  }, [action])

  const title = useMemo(() => {
    if (!action) return undefined
    return translate(action.transactionMetadata.message, {
      amount: action.transactionMetadata.amountCryptoPrecision,
      symbol: asset?.symbol,
      newAddress: firstFourLastFour(action.transactionMetadata.newAddress ?? ''),
    })
  }, [action, asset, translate])

  if (!action || !icon || !title) return null

  return <StandardToast icon={icon} title={title} onClick={handleClick} onClose={onClose} />
}
