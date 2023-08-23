import type { AssetId } from '@shapeshiftoss/caip'
import { cosmosAssetId, fromAssetId, thorchainAssetId, toAssetId } from '@shapeshiftoss/caip'

import type { Message } from '../types'
import type { TxMetadata } from './types'

const assetIdByDenom = new Map<string, AssetId>([
  ['uatom', cosmosAssetId],
  ['rune', thorchainAssetId],
])

export const getAssetIdByDenom = (denom: string, assetId: string): AssetId | undefined => {
  if (assetIdByDenom.has(denom)) return assetIdByDenom.get(denom) as AssetId

  const { chainId } = fromAssetId(assetId)

  const [assetNamespace, assetReference] = denom.split('/')

  if (assetNamespace === 'ibc' && assetReference) {
    return toAssetId({ chainId, assetNamespace, assetReference })
  }

  console.warn(`unknown denom: ${denom}`)

  return
}

export const metaData = (
  msg: Message,
  event: Record<string, Record<string, string>>,
  assetId: string,
): TxMetadata | undefined => {
  switch (msg.type) {
    case 'delegate':
      return {
        parser: 'staking',
        method: msg.type,
        value: msg.value.amount,
        assetId: getAssetIdByDenom(msg.value.denom, assetId) ?? '',
        delegator: msg.origin,
        destinationValidator: msg.to,
      }
    case 'begin_unbonding':
      return {
        parser: 'staking',
        method: msg.type,
        value: msg.value.amount,
        assetId: getAssetIdByDenom(msg.value.denom, assetId) ?? '',
        delegator: msg.origin,
        destinationValidator: msg.from,
      }
    case 'begin_redelegate':
      return {
        parser: 'staking',
        method: msg.type,
        value: msg.value.amount,
        assetId: getAssetIdByDenom(msg.value.denom, assetId) ?? '',
        delegator: msg.origin,
        sourceValidator: msg.from,
        destinationValidator: msg.to,
      }
    case 'withdraw_delegator_reward':
      return {
        parser: 'staking',
        method: msg.type,
        value: msg.value.amount,
        assetId: getAssetIdByDenom(msg.value.denom, assetId) ?? '',
        delegator: msg.origin,
        destinationValidator: msg.to,
      }
    case 'transfer':
      return {
        parser: 'ibc',
        method: msg.type,
        value: msg.value.amount,
        assetId: getAssetIdByDenom(msg.value.denom, assetId) ?? '',
        ibcSource: msg.origin,
        ibcDestination: msg.to,
        sequence: event['send_packet']['packet_sequence'],
      }
    case 'recv_packet':
      return {
        parser: 'ibc',
        method: msg.type,
        value: msg.value.amount,
        assetId: getAssetIdByDenom(msg.value.denom, assetId) ?? '',
        ibcSource: msg.origin,
        ibcDestination: msg.to,
        sequence: event['recv_packet']['packet_sequence'],
      }
    case 'deposit':
      if (event['add_liquidity']) {
        return {
          parser: 'lp',
          method: msg.type,
          pool: event['add_liquidity']['pool'],
        }
      }
      return {
        parser: 'swap',
        method: msg.type,
        memo: event['message']['memo'],
      }
    case 'outbound': {
      const memo = event['outbound']['memo']
      const [type] = memo.split(':')
      return {
        parser: 'swap',
        method: type.toLowerCase() || msg.type,
        memo: event['outbound']['memo'],
      }
    }
    case 'send':
      // known message types with no applicable metadata
      return
    default:
      console.warn(`unsupported message type: ${msg.type}`)
      return
  }
}
