import { createApi } from '@reduxjs/toolkit/dist/query/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import axios from 'axios'
import { getConfig } from 'config'
import { isSome } from 'lib/utils'
import { BASE_RTK_CREATE_API_CONFIG } from 'state/apis/const'
import { FEE_ASSET_IDS } from 'state/slices/selectors'

import { zerionImplementationToMaybeAssetId } from './mapping'
import { zerionFungiblesSchema } from './validators/fungible'

const ZERION_BASE_URL = 'https://api.zerion.io/v1'

const options = {
  method: 'GET' as const,
  baseURL: ZERION_BASE_URL,
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
        if (FEE_ASSET_IDS.includes(assetId)) return { data: [] } // tokens only
        try {
          //
          const filter = { params: { 'filter[implementation_address]': assetReference } }
          const url = '/fungibles/' // trailing slash is important!
          const payload = { ...options, ...filter, url }
          const { data: res } = await axios.request(payload)
          const validationResult = zerionFungiblesSchema.parse(res)
          const implementations = validationResult.data?.[0]?.attributes?.implementations
          const data =
            implementations
              ?.map(zerionImplementationToMaybeAssetId)
              .filter(isSome)
              .filter(id => id !== assetId) ?? [] // don't show input assetId in list of related assetIds
          return { data }
        } catch (e) {
          console.error(e)
          return { error: { error: e } }
        }
      },
    }),
  }),
})

export const { useGetRelatedAssetIdsQuery } = zerionApi
