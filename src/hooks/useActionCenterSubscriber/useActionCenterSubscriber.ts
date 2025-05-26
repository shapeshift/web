import { useToast } from '@chakra-ui/react'
import { useQueries } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { checkStatusHandlersMapping } from './checkStatusHandlers/checkStatusHandlersMapping'
import { useTradeActionSubscriber } from './useTradeActionSubscriber'

import { selectPendingActions } from '@/state/slices/actionSlice/selectors'
import { ActionStatus, isTradePayloadDiscriminator } from '@/state/slices/actionSlice/types'
import { selectSwapById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export const useActionCenterSubscriber = () => {
  useTradeActionSubscriber()
  const pendingActions = useAppSelector(selectPendingActions)
  const toast = useToast()
  const translate = useTranslate()
  const swapByIds = useAppSelector(selectSwapById)

  const actionsQueries = useMemo(() => {
    return pendingActions
      .map(action => {
        const handler = checkStatusHandlersMapping[action.type]

        if (!isTradePayloadDiscriminator(action)) return undefined

        const swap = swapByIds[action.metadata.swapId]

        if (!swap) return undefined

        return {
          queryKey: ['actionCenterPolling', action.id, swap.id, swap.metadata.sellTxHash],
          queryFn:
            handler && isTradePayloadDiscriminator(action)
              ? () =>
                  handler({
                    toast,
                    swap,
                    translate,
                  })
              : () => Promise.resolve(undefined),
          refetchInterval: 10000,
          enabled: Boolean(
            handler &&
              isTradePayloadDiscriminator(action) &&
              action.status === ActionStatus.Pending,
          ),
        }
      })
      .filter((query): query is NonNullable<typeof query> => query !== undefined)
  }, [pendingActions, toast, translate, swapByIds])

  useQueries({
    queries: actionsQueries,
  })
}
