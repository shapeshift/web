import type { ChainId } from '@shapeshiftoss/caip'
import {
  arbitrumChainId,
  arbitrumNovaChainId,
  avalancheChainId,
  baseChainId,
  bchChainId,
  bscChainId,
  btcChainId,
  cosmosChainId,
  dogeChainId,
  ethChainId,
  gnosisChainId,
  ltcChainId,
  mayachainChainId,
  optimismChainId,
  polygonChainId,
  solanaChainId,
  thorchainChainId,
  zecChainId,
} from '@shapeshiftoss/caip'
import * as unchained from '@shapeshiftoss/unchained-client'

import { getChainConfig } from './config.js'

export type UnchainedApi = {
  getAccount: (params: { pubkey: string }) => Promise<{
    balance: string
    unconfirmedBalance?: string
    pubkey: string
    // EVM specific
    nonce?: number
    tokens?: {
      assetId?: string
      balance: string
      name?: string
      symbol?: string
      decimals?: number
    }[]
    // UTXO specific
    addresses?: {
      pubkey: string
      balance: string
    }[]
    nextChangeAddressIndex?: number
    nextReceiveAddressIndex?: number
    // Cosmos specific
    sequence?: string
    accountNumber?: string
    delegations?: unknown[]
    redelegations?: unknown[]
    undelegations?: unknown[]
    rewards?: unknown[]
    assets?: {
      denom?: string
      amount?: string
    }[]
  }>
  getTxHistory: (params: { pubkey: string; pageSize?: number; cursor?: string }) => Promise<{
    txs: unknown[]
    cursor?: string
  }>
}

const apiCache = new Map<ChainId, UnchainedApi>()

export function getUnchainedApi(chainId: ChainId): UnchainedApi | null {
  const cachedApi = apiCache.get(chainId)
  if (cachedApi) {
    return cachedApi
  }

  const config = getChainConfig(chainId)
  if (!config) {
    console.warn(`[Unchained] No config found for chainId: ${chainId}`)
    return null
  }

  let api: UnchainedApi | null = null

  switch (chainId) {
    case ethChainId:
      api = new unchained.ethereum.V1Api(
        new unchained.ethereum.Configuration({ basePath: config.httpUrl }),
      ) as unknown as UnchainedApi
      break
    case avalancheChainId:
      api = new unchained.avalanche.V1Api(
        new unchained.avalanche.Configuration({ basePath: config.httpUrl }),
      ) as unknown as UnchainedApi
      break
    case optimismChainId:
      api = new unchained.optimism.V1Api(
        new unchained.optimism.Configuration({ basePath: config.httpUrl }),
      ) as unknown as UnchainedApi
      break
    case bscChainId:
      api = new unchained.bnbsmartchain.V1Api(
        new unchained.bnbsmartchain.Configuration({ basePath: config.httpUrl }),
      ) as unknown as UnchainedApi
      break
    case polygonChainId:
      api = new unchained.polygon.V1Api(
        new unchained.polygon.Configuration({ basePath: config.httpUrl }),
      ) as unknown as UnchainedApi
      break
    case gnosisChainId:
      api = new unchained.gnosis.V1Api(
        new unchained.gnosis.Configuration({ basePath: config.httpUrl }),
      ) as unknown as UnchainedApi
      break
    case arbitrumChainId:
      api = new unchained.arbitrum.V1Api(
        new unchained.arbitrum.Configuration({ basePath: config.httpUrl }),
      ) as unknown as UnchainedApi
      break
    case arbitrumNovaChainId:
      api = new unchained.arbitrumNova.V1Api(
        new unchained.arbitrumNova.Configuration({ basePath: config.httpUrl }),
      ) as unknown as UnchainedApi
      break
    case baseChainId:
      api = new unchained.base.V1Api(
        new unchained.base.Configuration({ basePath: config.httpUrl }),
      ) as unknown as UnchainedApi
      break
    case btcChainId:
      api = new unchained.bitcoin.V1Api(
        new unchained.bitcoin.Configuration({ basePath: config.httpUrl }),
      ) as unknown as UnchainedApi
      break
    case bchChainId:
      api = new unchained.bitcoincash.V1Api(
        new unchained.bitcoincash.Configuration({ basePath: config.httpUrl }),
      ) as unknown as UnchainedApi
      break
    case dogeChainId:
      api = new unchained.dogecoin.V1Api(
        new unchained.dogecoin.Configuration({ basePath: config.httpUrl }),
      ) as unknown as UnchainedApi
      break
    case ltcChainId:
      api = new unchained.litecoin.V1Api(
        new unchained.litecoin.Configuration({ basePath: config.httpUrl }),
      ) as unknown as UnchainedApi
      break
    case zecChainId:
      api = new unchained.zcash.V1Api(
        new unchained.zcash.Configuration({ basePath: config.httpUrl }),
      ) as unknown as UnchainedApi
      break
    case cosmosChainId:
      api = new unchained.cosmos.V1Api(
        new unchained.cosmos.Configuration({ basePath: config.httpUrl }),
      ) as unknown as UnchainedApi
      break
    case thorchainChainId:
      api = new unchained.thorchain.V1Api(
        new unchained.thorchain.Configuration({ basePath: config.httpUrl }),
      ) as unknown as UnchainedApi
      break
    case mayachainChainId:
      api = new unchained.mayachain.V1Api(
        new unchained.mayachain.Configuration({ basePath: config.httpUrl }),
      ) as unknown as UnchainedApi
      break
    case solanaChainId:
      api = new unchained.solana.V1Api(
        new unchained.solana.Configuration({ basePath: config.httpUrl }),
      ) as unknown as UnchainedApi
      break
    default:
      console.warn(`[Unchained] Unknown chainId: ${chainId}`)
      return null
  }

  if (api) {
    apiCache.set(chainId, api)
  }

  return api
}

export function clearApiCache(): void {
  apiCache.clear()
}
