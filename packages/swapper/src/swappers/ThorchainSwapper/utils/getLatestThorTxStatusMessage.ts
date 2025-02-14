import { assertUnreachable } from '@shapeshiftoss/utils'
import prettyMilliseconds from 'pretty-ms'

import { ThorchainStatusMessage } from '../constants'
import type { ThorNodeStatusResponseSuccess } from '../types'

export const getLatestThorTxStatusMessage = (
  response: ThorNodeStatusResponseSuccess,
  hasOutboundTx: boolean,
): string | undefined => {
  const stages_reverse_ordered = [
    'outbound_signed',
    'outbound_delay',
    'swap_finalised',
    'swap_status',
    'inbound_finalised',
    'inbound_confirmation_counted',
    'inbound_observed',
  ] as const

  for (const key of stages_reverse_ordered) {
    switch (key) {
      case 'inbound_observed': {
        const obj = response.stages[key]
        return obj.completed
          ? ThorchainStatusMessage.InboundObserved
          : ThorchainStatusMessage.InboundObservingPending
      }
      case 'inbound_confirmation_counted': {
        const obj = response.stages[key]
        if (obj === undefined) continue
        return obj.completed
          ? ThorchainStatusMessage.InboundConfirmationCounted
          : ThorchainStatusMessage.InboundConfirmationPending
      }
      case 'inbound_finalised': {
        const obj = response.stages[key]
        if (obj === undefined) continue
        return obj.completed
          ? ThorchainStatusMessage.InboundFinalized
          : ThorchainStatusMessage.InboundFinalizationPending
      }
      case 'swap_status': {
        const obj = response.stages[key]
        if (obj === undefined) continue

        return obj.pending
          ? ThorchainStatusMessage.SwapPending
          : hasOutboundTx
          ? ThorchainStatusMessage.SwapCompleteAwaitingOutbound
          : ThorchainStatusMessage.SwapCompleteAwaitingDestination
      }
      case 'swap_finalised': {
        // from thornode api docs, "to be deprecated in favor of swap_status"
        // see https://thornode.ninerealms.com/thorchain/doc/
        continue
      }
      case 'outbound_delay': {
        const obj = response.stages[key]
        if (obj === undefined || obj.completed) continue
        return obj.remaining_delay_seconds
          ? // poor man's i18n
            ThorchainStatusMessage.OutboundDelayTimeRemaining.replace(
              '{timeRemaining}',
              prettyMilliseconds(obj.remaining_delay_seconds * 100),
            )
          : ThorchainStatusMessage.OutboundDelayPending
      }
      case 'outbound_signed': {
        const obj = response.stages[key]
        if (obj === undefined) continue
        return obj.completed
          ? ThorchainStatusMessage.OutboundSigned
          : ThorchainStatusMessage.OutboundScheduled
      }
      default:
        return assertUnreachable(key)
    }
  }
}
