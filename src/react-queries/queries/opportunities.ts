import { createQueryKeys } from '@lukemorales/query-key-factory'
import type { AccountId } from '@shapeshiftoss/caip'
import {
  type AssetId,
  avalancheChainId,
  bchChainId,
  bscChainId,
  btcChainId,
  cosmosChainId,
  dogeChainId,
  fromAccountId,
  ltcChainId,
} from '@shapeshiftoss/caip'
import {
  fetchAllOpportunitiesIdsByChainId,
  fetchAllOpportunitiesMetadataByChainId,
  fetchAllOpportunitiesUserDataByAccountId,
} from 'state/slices/opportunitiesSlice/thunks'
import type { PortfolioAccount } from 'state/slices/portfolioSlice/portfolioSliceCommon'
import type { PortfolioLoadingStatus } from 'state/slices/selectors'
import type { AppDispatch } from 'state/store'

export const opportunities = createQueryKeys('opportunities', {
  all: (
    dispatch: AppDispatch,
    requestedAccountIds: AccountId[],
    portfolioAssetIds: AssetId[],
    portfolioAccounts: Record<AccountId, PortfolioAccount>,
    portfolioLoadingStatus: PortfolioLoadingStatus,
  ) => {
    return {
      queryKey: ['allOpportunities', { requestedAccountIds, portfolioAssetIds, portfolioAccounts }],
      queryFn: async () => {
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
                await fetchAllOpportunitiesIdsByChainId(dispatch, chainId)
                await fetchAllOpportunitiesMetadataByChainId(dispatch, chainId)
                await fetchAllOpportunitiesUserDataByAccountId(dispatch, accountId)
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
      enabled: portfolioLoadingStatus !== 'loading' && requestedAccountIds.length > 0,
      staleTime: Infinity,
      gcTime: Infinity,
    }
  },
})
