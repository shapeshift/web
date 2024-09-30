import { assertUnreachable } from '@shapeshiftoss/utils'
import prettyMilliseconds from 'pretty-ms'

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
          ? 'Inbound transaction accepted by THOR'
          : 'Inbound transaction pending'
      }
      case 'inbound_confirmation_counted': {
        const obj = response.stages[key]
        if (obj === undefined) continue
        return obj.completed
          ? 'Inbound transaction confirmed'
          : 'Awaiting inbound transaction confirmation'
      }
      case 'inbound_finalised': {
        const obj = response.stages[key]
        if (obj === undefined) continue
        return obj.completed
          ? 'Inbound transaction finalized'
          : 'Awaiting inbound transaction finalization'
      }
      case 'swap_status': {
        const obj = response.stages[key]
        if (obj === undefined) continue

        return obj.pending
          ? 'Swap pending'
          : `Swap complete, awaiting ${
              hasOutboundTx ? 'outbound transaction' : 'destination chain'
            }`
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
          ? `Awaiting outbound delay (${prettyMilliseconds(
              obj.remaining_delay_seconds * 100,
            )} remaining)`
          : 'Awaiting outbound delay'
      }
      case 'outbound_signed': {
        const obj = response.stages[key]
        if (obj === undefined) continue
        return obj.completed
          ? 'Outbound transaction transmitted, waiting on destination chain...'
          : 'Outbound transaction scheduled, waiting on destination chain...'
      }
      default:
        assertUnreachable(key)
    }
  }
}
