import { useToast } from '@chakra-ui/react'
import { useQueries } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { checkStatusHandlersMapping } from './checkStatusHandlers/checkStatusHandlersMapping'
import { useTradeActionSubscriber } from './useTradeActionSubscriber'

import { selectPendingActions } from '@/state/slices/actionSlice/selectors'
import { isTradePayloadDiscriminator } from '@/state/slices/actionSlice/types'
import { useAppSelector } from '@/state/store'

export const useActionCenterSubscriber = () => {
  useTradeActionSubscriber()
  const pendingActions = useAppSelector(selectPendingActions)
  const toast = useToast()
  const translate = useTranslate()

  const actionsQueries = useMemo(() => {
    return pendingActions.map(action => {
      const handler = checkStatusHandlersMapping[action.type]

      return {
        queryKey: ['actionCenterPolling', action.id],
        queryFn:
          handler && isTradePayloadDiscriminator(action)
            ? () =>
                handler({
                  toast,
                  quote: action.metadata.quote,
                  stepIndex: action.metadata.stepIndex,
                  sellTxHash: action.metadata.sellTxHash,
                  translate,
                  sellAccountId: action.metadata.sellAccountId,
                })
            : () => Promise.resolve(undefined),
        refetchInterval: 10000,
        enabled: Boolean(handler && isTradePayloadDiscriminator(action)),
      }
    })
  }, [pendingActions, toast, translate])

  useQueries({
    queries: actionsQueries,
  })
}
