import { createQueryKeys } from '@lukemorales/query-key-factory'
import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import {
  arbitrumChainId,
  type AssetId,
  avalancheChainId,
  bchChainId,
  bscChainId,
  btcChainId,
  cosmosChainId,
  dogeChainId,
  ethChainId,
  fromAccountId,
  ltcChainId,
  thorchainChainId,
} from '@shapeshiftoss/caip'
import {
  fetchAllOpportunitiesIdsByChainId,
  fetchAllOpportunitiesMetadataByChainId,
  fetchAllOpportunitiesUserDataByAccountId,
} from 'state/slices/opportunitiesSlice/thunks'
import type { PortfolioAccount } from 'state/slices/portfolioSlice/portfolioSliceCommon'
import type { AppDispatch } from 'state/store'

type FetchAllArgs = {
  dispatch: AppDispatch
  accountId: AccountId | undefined
  chainId: ChainId
}

const fetchAll = async ({ dispatch, accountId, chainId }: FetchAllArgs): Promise<void> => {
  switch (chainId) {
    case btcChainId:
    case ltcChainId:
    case dogeChainId:
    case bchChainId:
    case cosmosChainId:
    case bscChainId:
    case avalancheChainId:
    case arbitrumChainId:
    case ethChainId:
    case thorchainChainId:
      await fetchAllOpportunitiesIdsByChainId(dispatch, chainId)
      await fetchAllOpportunitiesMetadataByChainId(dispatch, chainId)
      if (accountId) {
        await fetchAllOpportunitiesUserDataByAccountId(dispatch, accountId)
      }
      break
    default:
      break
  }
}

export const opportunities = createQueryKeys('opportunities', {
  all: (
    dispatch: AppDispatch,
    requestedAccountIds: AccountId[],
    portfolioAssetIds: AssetId[],
    portfolioAccounts: Record<AccountId, PortfolioAccount>,
    requestedChainIds: ChainId[],
  ) => {
    return {
      queryKey: [
        'allOpportunities',
        { requestedAccountIds, requestedChainIds, portfolioAssetIds, portfolioAccounts },
      ],
      queryFn: async () => {
        // We don't have any AccountIds here, but still need to fetch opportunities meta
        if (!requestedAccountIds?.length) {
          await Promise.all(
            requestedChainIds.map(async chainId => {
              await fetchAll({ dispatch, accountId: undefined, chainId })
            }),
          )
        }

        await Promise.all(
          requestedAccountIds.map(async accountId => {
            const { chainId } = fromAccountId(accountId)
            await fetchAll({ dispatch, accountId, chainId })
          }),
        )

        // We *have* to return a value other than undefined from react-query queries, see
        // https://tanstack.com/query/v4/docs/react/guides/migrating-to-react-query-4#undefined-is-an-illegal-cache-value-for-successful-queries
        return null
      },
    }
  },
})
