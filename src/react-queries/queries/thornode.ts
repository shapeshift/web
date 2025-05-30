import { createQueryKeys } from '@lukemorales/query-key-factory'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { mayachainChainId, thorchainChainId } from '@shapeshiftoss/caip'
import type { InboundAddressResponse, ThornodePoolResponse } from '@shapeshiftoss/swapper'
import { assetIdToThorPoolAssetId } from '@shapeshiftoss/swapper'
import type { QueryFunction } from '@tanstack/react-query'
import axios from 'axios'

import { getConfig } from '@/config'
import type { ThorchainBlock, ThorchainMimir } from '@/lib/utils/thorchain/types'

export const createThornodeQueries = <T extends string>(key: T, baseUrl: string) => {
  return createQueryKeys(key, {
    poolData: (assetId: AssetId | undefined) => ({
      queryKey: [`${key}PoolData`, assetId] as const,
      queryFn: async () => {
        if (!assetId) throw new Error('assetId is required')

        const poolAssetId = assetIdToThorPoolAssetId({ assetId })
        const { data } = await axios.get<ThornodePoolResponse>(`${baseUrl}/pool/${poolAssetId}`)

        return data
      },
    }),
    poolsData: () => ({
      queryKey: [`${key}PoolsData`],
      queryFn: async () => {
        const { data } = await axios.get<ThornodePoolResponse[]>(`${baseUrl}/pools`)
        return data
      },
    }),
    mimir: () => {
      return {
        queryKey: [`${key}Mimir`] as const,
        queryFn: async () => {
          const { data } = await axios.get<ThorchainMimir>(`${baseUrl}/mimir`)
          return data
        },
      }
    },
    block: () => {
      return {
        queryKey: [`${key}BlockHeight`],
        queryFn: async () => {
          const { data } = await axios.get<ThorchainBlock>(`${baseUrl}/block`)
          return data
        },
      }
    },
    inboundAddresses: () => {
      return {
        queryKey: [`${key}InboundAddress`],
        queryFn: async () => {
          const { data } = await axios.get<InboundAddressResponse[]>(`${baseUrl}/inbound_addresses`)
          return data.filter(v => !v.halted)
        },
      }
    },
  })
}

export const thornode = createThornodeQueries(
  'thornode',
  `${getConfig().VITE_THORCHAIN_NODE_URL}/thorchain`,
)

export const mayanode = createThornodeQueries(
  'mayanode',
  `${getConfig().VITE_MAYACHAIN_NODE_URL}/mayachain`,
)

export const getInboundAddressesQuery = (chainId: ChainId) => {
  const { queryKey, queryFn } = (() => {
    switch (chainId) {
      case thorchainChainId:
        return thornode.inboundAddresses()
      case mayachainChainId:
        return mayanode.inboundAddresses()
      default:
        throw new Error(`Unsupported chainId: ${chainId}`)
    }
  })()

  return {
    queryKey,
    queryFn: queryFn as QueryFunction<InboundAddressResponse[]>,
  }
}

export const getMimirQuery = (chainId: ChainId) => {
  const { queryKey, queryFn } = (() => {
    switch (chainId) {
      case thorchainChainId:
        return thornode.mimir()
      case mayachainChainId:
        return mayanode.mimir()
      default:
        throw new Error(`Unsupported chainId: ${chainId}`)
    }
  })()

  return {
    queryKey,
    queryFn: queryFn as QueryFunction<ThorchainMimir>,
  }
}
