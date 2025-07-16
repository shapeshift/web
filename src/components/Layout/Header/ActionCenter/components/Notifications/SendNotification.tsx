import { Box, Flex, HStack, Stack, usePrevious } from '@chakra-ui/react'
import type { RenderProps } from '@chakra-ui/react/dist/types/toast/toast.types'
import { fromAccountId } from '@shapeshiftoss/caip'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useDispatch } from 'react-redux'

import { ActionStatusIcon } from '../ActionStatusIcon'
import { NotificationWrapper } from './NotificationWrapper'

import { AssetIconWithBadge } from '@/components/AssetIconWithBadge'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import { selectWalletActionsSorted } from '@/state/slices/actionSlice/selectors'
import { ActionStatus, isGenericTransactionAction } from '@/state/slices/actionSlice/types'
import { selectAssetById, selectTxById } from '@/state/slices/selectors'
import { serializeTxIndex } from '@/state/slices/txHistorySlice/utils'
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

  const accountAddress = useMemo(() => {
    if (!transactionMetadata) return

    return fromAccountId(transactionMetadata.accountId).account
  }, [transactionMetadata])

  const serializedTxIndex = useMemo(() => {
    if (!accountAddress) return
    if (!transactionMetadata) return

    const { accountId, txHash } = transactionMetadata

    return accountId && txHash && accountAddress
      ? serializeTxIndex(accountId, txHash, accountAddress)
      : undefined
  }, [accountAddress, transactionMetadata])

  const tx = useAppSelector(state =>
    serializedTxIndex ? selectTxById(state, serializedTxIndex) : undefined,
  )

  const txStatus = useMemo(() => tx?.status, [tx?.status])
  const prevTxStatus = usePrevious(txStatus)

  useEffect(() => {
    if (!action) return
    if (!transactionMetadata) return
    if (!txStatus || txStatus === prevTxStatus) return

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
  }, [txStatus, prevTxStatus])

  const asset = useAppSelector(state =>
    selectAssetById(state, action?.transactionMetadata?.assetId ?? ''),
  )

  if (!action) return null

  // TODO(gomes): wrt the below, we can effectively consume <GenericTransactionNotification /> directly instead of this JSX node
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
