import { usePrevious } from '@chakra-ui/react'
import { fromAccountId } from '@shapeshiftoss/caip'
import type { Swap } from '@shapeshiftoss/swapper'
import {
  fetchSafeTransactionInfo,
  SwapperName,
  swappers,
  SwapStatus,
  TRADE_STATUS_POLL_INTERVAL_MILLISECONDS,
} from '@shapeshiftoss/swapper'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useQueries } from '@tanstack/react-query'
import { uuidv4 } from '@walletconnect/utils'
import { useCallback, useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { fetchIsSmartContractAddressQuery } from '../useIsSmartContractAddress/useIsSmartContractAddress'
import { useNotificationToast } from '../useNotificationToast'
import { useWallet } from '../useWallet/useWallet'

import { useActionCenterContext } from '@/components/Layout/Header/ActionCenter/ActionCenterContext'
import { SwapNotification } from '@/components/Layout/Header/ActionCenter/components/Notifications/SwapNotification'
import { getConfig } from '@/config'
import { queryClient } from '@/context/QueryClientProvider/queryClient'
import { getTxLink } from '@/lib/getTxLink'
import { fetchTradeStatus, tradeStatusQueryKey } from '@/lib/tradeExecution'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import { selectPendingSendActions } from '@/state/slices/actionSlice/selectors'
import { swapSlice } from '@/state/slices/swapSlice/swapSlice'
import { store, useAppDispatch, useAppSelector } from '@/state/store'

export const useSendActionSubscriber = () => {
  const { isDrawerOpen, openActionCenter } = useActionCenterContext()

  const dispatch = useAppDispatch()
  const translate = useTranslate()

  const toast = useNotificationToast({ duration: isDrawerOpen ? 5000 : null })

  const pendingSendActions = useAppSelector(selectPendingSendActions)

  // TODO(gomes): this log works, which is nice
  // The send card should be the source of truth, which will allow us to very easily do useTxStatus() there and introspect the status
  // Then, the card can automagically update *and* upsert on completion, which will negate the need for this unless closed
  // This SHOULD still exist however, as user may have closed the notification/the app, so we can't rely solely on card updates if mounted,
  // but let's implement this last before opening the PR once card "live notification"'s working
  console.log({ pendingSendActions })
  const {
    state: { isConnected },
  } = useWallet()
  const previousIsDrawerOpen = usePrevious(isDrawerOpen)

  useEffect(() => {
    if (isDrawerOpen && !previousIsDrawerOpen) {
      toast.closeAll()
    }
  }, [isDrawerOpen, toast, previousIsDrawerOpen])
}
