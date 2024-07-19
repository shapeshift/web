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
  marketData: ZerionMarketData | undefined
}[]

const ZERION_BASE_URL = 'https://zerion.shapeshift.com/'

const axiosInstance = axios.create()

type ZerionMarketData = {
  price: number
  total_supply: number
  circulating_supply: number
  fully_diluted_valuation: number
  market_cap: number
  changes: {
    percent_1d: number
    percent_30d: number
    percent_90d: number
    pecent_365d: number
  }
}

type ZerionFungibles = {
  data: {
    attributes: {
      market_data: ZerionMarketData
    }
  }
}

export const getTokenMarketData = async (
  assetId: AssetId,
): Promise<ZerionMarketData | undefined> => {
  const { assetReference } = fromAssetId(assetId)
  const url = `${ZERION_BASE_URL}/fungibles/${assetReference}`
  const { data: res } = await axios.get<ZerionFungibles>(url)
  return res.data.attributes.market_data
}

const getQueryFn = (assetId: AssetId) => async () => {
  const marketData = await getTokenMarketData(assetId)
  return { marketData, assetId }
}
const getQueryKey = (assetId: AssetId) => ['customTokenPrices', assetId]

export const useGetCustomTokenPricesQuery = ({
  assetIds,
}: UseGetCustomTokenPricesQueryProps): UseQueryResult<
  UseGetCustomTokenPricesQueryReturn,
  Error[]
> => {
  const customTokenImportEnabled = useFeatureFlag('CustomTokenImport')

  const customTokensMarketData = useQueries({
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

  return customTokensMarketData
}
