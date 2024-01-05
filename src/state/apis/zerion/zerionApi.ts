import { createApi } from '@reduxjs/toolkit/dist/query/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { FEE_ASSET_IDS, fromAssetId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import axios from 'axios'
import memoize from 'lodash/memoize'
import { isSome } from 'lib/utils'
import { BASE_RTK_CREATE_API_CONFIG } from 'state/apis/const'

import { zerionImplementationToMaybeAssetId } from './mapping'
import { zerionFungiblesSchema } from './validators/fungible'

const ZERION_BASE_URL = 'https://zerion.shapeshift.com'

const options = {
  method: 'GET' as const,
  baseURL: ZERION_BASE_URL,
}

// Looks like we're using a useless memoize here as zerionApi.endpoints.getRelatedAssetIds takes care of caching
// But this is actually useful, we use _getRelatedAssetIds outside of RTK - since related AssetIds never change, this should be memoized
export const _getRelatedAssetIds = memoize(async (assetId: AssetId): Promise<AssetId[]> => {
  const { chainId, assetReference } = fromAssetId(assetId)

  if (!isEvmChainId(chainId) || FEE_ASSET_IDS.includes(assetId)) return []

  try {
    const filter = { params: { 'filter[implementation_address]': assetReference } }
    const url = '/fungibles'
    const payload = { ...options, ...filter, url }
    const { data: res } = await axios.request(payload)
    const validationResult = zerionFungiblesSchema.parse(res)
    const implementations = validationResult.data?.[0]?.attributes?.implementations

    return (
      implementations
        ?.map(zerionImplementationToMaybeAssetId)
        .filter(isSome)
        .filter(id => id !== assetId) ?? []
    )
  } catch (e) {
    console.error(e)
    throw e
  }
})

// https://developers.zerion.io
export const zerionApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'zerionApi',
  endpoints: build => ({
    getRelatedAssetIds: build.query<AssetId[], AssetId>({
      queryFn: async assetId => {
        try {
          const data = await _getRelatedAssetIds(assetId)
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
