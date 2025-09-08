import type { AssetId } from '@shapeshiftoss/caip'
import {
  cosmosAssetId,
  mayachainAssetId,
  rujiAssetId,
  tcyAssetId,
  thorchainAssetId,
} from '@shapeshiftoss/caip'

import type { Message } from '../types'
import type { TxMetadata } from './types'

const mayaTokenAssetId: AssetId = 'cosmos:mayachain-mainnet-v1/slip44:maya'

const assetIdByDenom = new Map<string, AssetId>([
  ['uatom', cosmosAssetId],
  ['rune', thorchainAssetId],
  ['tcy', tcyAssetId],
  ['x/ruji', rujiAssetId],
  ['thor.ruji', rujiAssetId],
  ['maya', mayaTokenAssetId],
  ['thor.tcy', tcyAssetId],
  ['cacao', mayachainAssetId],
])

export const getAssetIdByDenom = (denom: string): AssetId | undefined => {
  if (assetIdByDenom.has(denom)) return assetIdByDenom.get(denom) as AssetId
}

export const metaData = (
  msg: Message,
  event: Record<string, Record<string, string>>,
): TxMetadata | undefined => {
  switch (msg.type) {
    case 'delegate':
      return {
        parser: 'staking',
        method: msg.type,
        value: msg.value.amount,
        assetId: getAssetIdByDenom(msg.value.denom) ?? '',
        delegator: msg.origin,
        destinationValidator: msg.to,
      }
    case 'begin_unbonding':
      return {
        parser: 'staking',
        method: msg.type,
        value: msg.value.amount,
        assetId: getAssetIdByDenom(msg.value.denom) ?? '',
        delegator: msg.origin,
        destinationValidator: msg.from,
      }
    case 'begin_redelegate':
      return {
        parser: 'staking',
        method: msg.type,
        value: msg.value.amount,
        assetId: getAssetIdByDenom(msg.value.denom) ?? '',
        delegator: msg.origin,
        sourceValidator: msg.from,
        destinationValidator: msg.to,
      }
    case 'withdraw_delegator_reward':
      return {
        parser: 'staking',
        method: msg.type,
        value: msg.value.amount,
        assetId: getAssetIdByDenom(msg.value.denom) ?? '',
        delegator: msg.origin,
        destinationValidator: msg.to,
      }
    case 'deposit':
      if (!event['add_liquidity']) return
      return {
        parser: 'lp',
        method: msg.type,
        pool: event['add_liquidity']['pool'],
      }
    case 'send':
      // known message types with no applicable metadata
      return
    default:
      console.warn(`unsupported message type: ${msg.type}`)
      return
  }
}
