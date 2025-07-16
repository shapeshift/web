import { Box, Flex, HStack, Stack, usePrevious } from '@chakra-ui/react'
import type { RenderProps } from '@chakra-ui/react/dist/types/toast/toast.types'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useDispatch } from 'react-redux'

import { ActionStatusIcon } from '../ActionStatusIcon'
import { NotificationWrapper } from './NotificationWrapper'

import { AssetIconWithBadge } from '@/components/AssetIconWithBadge'
import { useTxStatus } from '@/hooks/useTxStatus/useTxStatus'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import { selectWalletActionsSorted } from '@/state/slices/actionSlice/selectors'
import { ActionStatus, isGenericTransactionAction } from '@/state/slices/actionSlice/types'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export type GenericTransactionNotificationProps = {
  handleClick: () => void
  actionId: string
} & RenderProps

export const SendNotification = ({
  handleClick,
  actionId,
  onClose,
}: GenericTransactionNotificationProps) => {
  const dispatch = useDispatch()
  const translate = useTranslate()
  const actions = useAppSelector(selectWalletActionsSorted)
  const action = useMemo(
    () => actions.filter(isGenericTransactionAction).find(a => a.id === actionId),
    [actions, actionId],
  )

  const transactionMetadata = useMemo(
    () => action?.transactionMetadata,
    [action?.transactionMetadata],
  )

  const txStatus = useTxStatus({
    accountId: transactionMetadata?.accountId ?? null,
    txHash: transactionMetadata?.txHash ?? null,
  })
  const prevTxStatus = usePrevious(txStatus)

  useEffect(() => {
    if (!action) return
    if (!transactionMetadata) return
    if (!txStatus || txStatus === prevTxStatus) return

    // This may have already been upserted from the poller, ensure we don't overwrite it
    if (action.status === ActionStatus.Complete) return

    if ((!prevTxStatus || prevTxStatus === TxStatus.Pending) && txStatus === TxStatus.Confirmed) {
      dispatch(
        actionSlice.actions.upsertAction({
          ...action,
          status: ActionStatus.Complete,
          updatedAt: Date.now(),
          transactionMetadata: {
            ...transactionMetadata,
            message: 'modals.send.youHaveSent',
          },
        }),
      )
    }
  }, [action, txStatus, prevTxStatus])

  const asset = useAppSelector(state =>
    selectAssetById(state, action?.transactionMetadata?.assetId ?? ''),
  )

  if (!action) return null

  return (
    <NotificationWrapper handleClick={handleClick} onClose={onClose}>
      <Stack spacing={3}>
        <Flex alignItems='center' justifyContent='space-between' pe={6}>
          <HStack spacing={2}>
            <AssetIconWithBadge assetId={action.transactionMetadata.assetId} size='md'>
              <ActionStatusIcon status={action.status} />
            </AssetIconWithBadge>
            <Box ml={2}>
              <Box fontSize='sm' letterSpacing='0.02em'>
                {translate(action.transactionMetadata.message, {
                  ...action.transactionMetadata,
                  amount: action.transactionMetadata.amountCryptoPrecision,
                  symbol: asset?.symbol,
                })}
              </Box>
            </Box>
          </HStack>
        </Flex>
      </Stack>
    </NotificationWrapper>
  )
}
