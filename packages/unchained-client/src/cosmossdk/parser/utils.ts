import { Logger } from '@shapeshiftoss/logger'

import { Message } from '../types'
import { TxMetadata } from './types'

const logger = new Logger({
  namespace: ['unchained-client', 'cosmossdk', 'parser', 'utils'],
  level: process.env.LOG_LEVEL,
})

// TODO: break out metadata by parser category to allow more explicit metadata types and pull out chain specific logic to appropriate chain parser
export const metaData = (msg: Message | undefined, assetId: string): TxMetadata | undefined => {
  if (!msg) return

  switch (msg.type) {
    case 'delegate':
    case 'begin_unbonding':
      return {
        parser: 'cosmos',
        method: msg.type,
        delegator: msg.from,
        destinationValidator: msg.to,
        value: msg?.value?.amount,
      }
    case 'begin_redelegate':
      return {
        parser: 'cosmos',
        method: msg.type,
        sourceValidator: msg.from,
        delegator: msg.origin,
        destinationValidator: msg.to,
        value: msg?.value?.amount,
        assetId,
      }
    case 'withdraw_delegator_reward':
      return {
        parser: 'cosmos',
        method: msg.type,
        destinationValidator: msg.to,
        value: msg?.value?.amount,
        assetId,
      }
    case 'transfer':
    case 'recv_packet':
      return {
        parser: 'cosmos',
        method: 'ibc_transfer',
        ibcDestination: msg.to,
        ibcSource: msg.from,
        assetId,
        value: msg?.value?.amount,
      }
    case 'swap_exact_amount_in':
      // TODO: parse applicable metadata
      return
    case 'send':
      // known message types with no applicable metadata
      return
    default:
      logger.warn(`unsupported message type: ${msg.type}`)
      return
  }
}
