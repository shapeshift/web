import { createApi } from '@reduxjs/toolkit/dist/query/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import axios from 'axios'
import { getConfig } from 'config'
import { logger } from 'lib/logger'
import { isSome } from 'lib/utils'
import { BASE_RTK_CREATE_API_CONFIG } from 'state/apis/const'

import type { ZerionFungiblesSchema } from './types'
import { zerionAssetIdToAssetId } from './utils'
import { zerionFungiblesSchema } from './validators/fungible'

const moduleLogger = logger.child({ module: 'zerionApi' })

const ZERION_BASE_URL = 'https://api.zerion.io/v1'

const options = {
  method: 'GET' as const,
  url: ZERION_BASE_URL,
  headers: {
    accept: 'application/json',
    authorization: `Basic ${getConfig().REACT_APP_ZERION_API_KEY}`,
  },
}

// https://developers.zerion.io
export const zerionApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'zerionApi',
  endpoints: build => ({
    /**
     * given an assetId, return a list of related assetIds
     * e.g. USDC on any chain
     */
    getRelatedAssetIds: build.query<AssetId[], AssetId>({
      queryFn: async assetId => {
        const { chainId, assetReference } = fromAssetId(assetId)
        if (!isEvmChainId(chainId)) return { data: [] } // EVM only
        // e.g. USDT https://api.zerion.io/v1/fungibles
        const url = `${ZERION_BASE_URL}/fungibles/` // trailing slash is important!
        try {
          //
          const filter = {
            params: {
              // e.g. 0xdac17f958d2ee523a2206206994597c13d831ec7
              'filter[implementation_address]': assetReference,
            },
          }
          const { data } = await axios.request<ZerionFungiblesSchema>({
            ...options,
            ...filter,
            url,
          })
          const validationResult = zerionFungiblesSchema.safeParse(data)
          if (validationResult.success) {
            const { attributes } = validationResult.data.data[0]
            const { implementations } = attributes
            const data =
              implementations
                ?.map(implementation => {
                  const { chain_id: zerionChainId, address } = implementation
                  const assetId = zerionAssetIdToAssetId(`${address}-${zerionChainId}-asset`)
                  return assetId
                })
                .filter(isSome)
                // don't show input assetId in list of related assetIds
                .filter(id => id !== assetId) ?? []
            return { data }
          } else {
            moduleLogger.warn(validationResult.error, '')
            return { error: { error: validationResult.error } }
          }
        } catch (e) {
          moduleLogger.warn(e, '')
          return { error: { error: e } }
        }
      },
    }),
  }),
})

export const { useGetRelatedAssetIdsQuery } = zerionApi
