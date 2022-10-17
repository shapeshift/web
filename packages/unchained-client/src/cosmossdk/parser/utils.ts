import {
  AssetId,
  cosmosAssetId,
  fromAssetId,
  osmosisAssetId,
  thorchainAssetId,
  toAssetId,
} from '@shapeshiftoss/caip'
import { Logger } from '@shapeshiftoss/logger'

import { Message } from '../types'
import { TxMetadata } from './types'

const logger = new Logger({
  namespace: ['unchained-client', 'cosmossdk', 'parser', 'utils'],
  level: process.env.LOG_LEVEL,
})

const assetIdByDenom = new Map<string, AssetId>([
  ['uatom', cosmosAssetId],
  ['uosmo', osmosisAssetId],
  ['rune', thorchainAssetId],
])

export const getAssetIdByDenom = (denom: string, assetId: string): AssetId | undefined => {
  if (assetIdByDenom.has(denom)) return assetIdByDenom.get(denom) as AssetId

  const { chainId } = fromAssetId(assetId)

  const [assetNamespace, assetReference] = denom.split('/')
  if (assetNamespace === 'ibc' && assetReference) {
    return toAssetId({ chainId, assetNamespace, assetReference })
  }

  logger.warn(`unknown denom: ${denom}`)

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
    case 'recv_packet':
      return {
        parser: 'ibc',
        method: msg.type,
        value: msg.value.amount,
        assetId: getAssetIdByDenom(msg.value.denom, assetId) ?? '',
        ibcSource: msg.origin,
        ibcDestination: msg.to,
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
