import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import {
  avalancheChainId,
  bchChainId,
  bscChainId,
  btcChainId,
  cosmosChainId,
  dogeChainId,
  fromAccountId,
  ltcChainId,
} from '@shapeshiftoss/caip'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import {
  useGetZapperAppsBalancesOutputQuery,
  useGetZapperUniV2PoolAssetIdsQuery,
} from 'state/apis/zapper/zapperApi'
import {
  fetchAllOpportunitiesIdsByChainId,
  fetchAllOpportunitiesMetadataByChainId,
  fetchAllOpportunitiesUserDataByAccountId,
} from 'state/slices/opportunitiesSlice/thunks'
import type { PortfolioAccount } from 'state/slices/portfolioSlice/portfolioSliceCommon'
import {
  selectPortfolioAccounts,
  selectPortfolioAssetIds,
  selectPortfolioLoadingStatus,
  selectWalletAccountIds,
} from 'state/slices/selectors'

export const useFetchOpportunities = () => {
  const portfolioLoadingStatus = useSelector(selectPortfolioLoadingStatus)
  const requestedAccountIds = useSelector(selectWalletAccountIds)
  const portfolioAssetIds = useSelector(selectPortfolioAssetIds)
  const portfolioAccounts = useSelector(selectPortfolioAccounts)
  const DynamicLpAssets = useFeatureFlag('DynamicLpAssets')

  const { isLoading: isZapperAppsBalancesOutputLoading } = useGetZapperAppsBalancesOutputQuery()
  const { isLoading: isZapperUniV2PoolAssetIdsLoading } = useGetZapperUniV2PoolAssetIdsQuery(
    undefined,
    { skip: !DynamicLpAssets },
  )

  const queryKey: [
    string,
    {
      requestedAccountIds: AccountId[]
      portfolioAssetIds: AssetId[]
      portfolioAccounts: Record<AccountId, PortfolioAccount>
    },
  ] = useMemo(() => {
    return ['fetchAllOpportunities', { requestedAccountIds, portfolioAssetIds, portfolioAccounts }]
  }, [portfolioAccounts, portfolioAssetIds, requestedAccountIds])

  const { isLoading } = useQuery({
    queryKey,
    queryFn: async ({ queryKey: [_, { requestedAccountIds }] }) => {
      await Promise.all(
        requestedAccountIds.map(async accountId => {
          const { chainId } = fromAccountId(accountId)
          switch (chainId) {
            case btcChainId:
            case ltcChainId:
            case dogeChainId:
            case bchChainId:
            case cosmosChainId:
            case bscChainId:
            case avalancheChainId:
              await fetchAllOpportunitiesIdsByChainId(chainId)
              await fetchAllOpportunitiesMetadataByChainId(chainId)
              await fetchAllOpportunitiesUserDataByAccountId(accountId)
              break
            default:
              break
          }
        }),
      )

      // We *have* to return a value other than undefined from react-query queries, see
      // https://tanstack.com/query/v4/docs/react/guides/migrating-to-react-query-4#undefined-is-an-illegal-cache-value-for-successful-queries
      return null
    },
    // once the portfolio is loaded, fetch opportunities data
    enabled: portfolioLoadingStatus !== 'loading' && requestedAccountIds.length > 0,
    refetchInterval: false,
    staleTime: Infinity,
    gcTime: Infinity,
  })

  return useMemo(
    () => ({
      isLoading: isLoading || isZapperAppsBalancesOutputLoading || isZapperUniV2PoolAssetIdsLoading,
    }),
    [isLoading, isZapperAppsBalancesOutputLoading, isZapperUniV2PoolAssetIdsLoading],
  )
}
