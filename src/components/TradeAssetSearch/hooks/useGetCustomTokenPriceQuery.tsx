import { type AssetId, fromAssetId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import { useQueries, type UseQueryResult } from '@tanstack/react-query'
import axios from 'axios'
import { mergeQueryOutputs } from 'react-queries/helpers'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'

type UseGetCustomTokenPricesQueryProps = {
  assetIds: AssetId[]
}

type UseGetCustomTokenPricesQueryReturn = {
  assetId: AssetId
  priceUsd: string | undefined
}[]

const ZERION_BASE_URL = 'https://api.zerion.io/v1'
const ZERION_API_KEY = '' // Don't commit me

const axiosInstance = axios.create()

export const getTokenPrice = async (assetId: AssetId): Promise<string | undefined> => {
  const basicAuth = 'Basic ' + Buffer.from(ZERION_API_KEY + ':').toString('base64')

  const options = {
    method: 'GET' as const,
    baseURL: ZERION_BASE_URL,
    headers: {
      Authorization: basicAuth,
    },
  }

  const { assetReference } = fromAssetId(assetId)
  const url = `/fungibles/${assetReference}/price`
  const payload = { ...options, url }
  const { data: res } = await axiosInstance.request(payload)

  return res.data.attributes.market_data.priceUsd
}

const getQueryFn = (assetId: AssetId) => async () => {
  const priceUsd = await getTokenPrice(assetId)
  return { priceUsd, assetId }
}
const getQueryKey = (assetId: AssetId) => ['customTokenPrices', assetId]

export const useGetCustomTokenPricesQuery = ({
  assetIds,
}: UseGetCustomTokenPricesQueryProps): UseQueryResult<
  UseGetCustomTokenPricesQueryReturn,
  Error[]
> => {
  const customTokenImportEnabled = useFeatureFlag('CustomTokenImport')

  const customTokenPrices = useQueries({
    queries: assetIds.map(assetId => {
      const { chainId } = fromAssetId(assetId)
      const enabled = customTokenImportEnabled && isEvmChainId(chainId)
      return {
        queryKey: getQueryKey(assetId),
        queryFn: getQueryFn(assetId),
        enabled,
        staleTime: Infinity,
      }
    }),
    combine: queries => mergeQueryOutputs(queries, results => results),
  })

  return customTokenPrices
}
