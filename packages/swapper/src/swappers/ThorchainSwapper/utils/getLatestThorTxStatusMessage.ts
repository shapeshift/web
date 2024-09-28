import { TxStatus } from '@shapeshiftoss/unchained-client'
import { assertUnreachable } from '@shapeshiftoss/utils'
import prettyMilliseconds from 'pretty-ms'

import type { ThorNodeStatusResponseSuccess } from '../types'

export const getLatestThorTxStatusMessage = (
  response: ThorNodeStatusResponseSuccess,
  hasOutboundTx: boolean,
): { status: TxStatus; message: string | undefined } => {
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
        return {
          message: obj.completed
            ? 'Inbound transaction accepted by THOR'
            : 'Inbound transaction pending',
          status: TxStatus.Pending,
        }
      }
      case 'inbound_confirmation_counted': {
        const obj = response.stages[key]
        if (obj === undefined) continue
        return {
          message: obj.completed
            ? 'Inbound transaction confirmed'
            : 'Awaiting inbound transaction confirmation',
          status: TxStatus.Pending,
        }
      }
      case 'inbound_finalised': {
        const obj = response.stages[key]
        if (obj === undefined) continue
        return {
          message: obj.completed
            ? 'Inbound transaction finalized'
            : 'Awaiting inbound transaction finalization',
          status: TxStatus.Pending,
        }
      }
      case 'swap_status': {
        const obj = response.stages[key]
        if (obj === undefined) continue

        // skip status message during streaming as this is handled separately
        if (obj.streaming) {
          return {
            message: undefined,
            status: TxStatus.Pending,
          }
        }

        return {
          message: obj.pending ? 'Swap pending' : 'Swap complete, awaiting finalization',
          status: TxStatus.Pending,
        }
      }
      case 'swap_finalised': {
        const obj = response.stages[key]
        if (obj === undefined) continue

        if (!hasOutboundTx && obj.completed) {
          return {
            message: undefined, // undefined because the tx is complete and no message will be displayed
            status: TxStatus.Confirmed,
          }
        }

        return {
          message: obj.completed
            ? 'Swap finalized, awaiting outbound transaction'
            : 'Awaiting swap finalization',
          status: TxStatus.Pending,
        }
      }
      case 'outbound_delay': {
        const obj = response.stages[key]
        if (obj === undefined || obj.completed) continue
        return {
          message: obj.remaining_delay_seconds
            ? `Awaiting outbound delay (${prettyMilliseconds(
                obj.remaining_delay_seconds * 100,
              )} remaining)`
            : 'Awaiting outbound delay',
          status: TxStatus.Pending,
        }
      }
      case 'outbound_signed': {
        const obj = response.stages[key]
        if (obj === undefined) continue
        return {
          message: obj.completed
            ? 'Outbound transaction transmitted, waiting on destination chain...'
            : 'Outbound transaction scheduled, waiting on destination chain...',
          status: TxStatus.Pending,
        }
      }
      default:
        assertUnreachable(key)
    }
  }

  return {
    message: undefined,
    status: TxStatus.Unknown,
  }
}
