import { createQueryKeys } from '@lukemorales/query-key-factory'
import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import {
  arbitrumChainId,
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
  fetchAllOpportunitiesUserDataByAccountId,
  fetchAllStakingOpportunitiesMetadataByChainId,
} from '@/state/slices/opportunitiesSlice/thunks'
import type { PortfolioAccount } from '@/state/slices/portfolioSlice/portfolioSliceCommon'
import type { AppDispatch } from '@/state/store'

type FetchAllArgs = {
  dispatch: AppDispatch
  accountId: AccountId | undefined
  chainId: ChainId
}

const fetchAll = async ({ dispatch, accountId, chainId }: FetchAllArgs): Promise<void> => {
  console.log('[React-Queries] fetchAll called:', { chainId, hasAccountId: !!accountId, accountId })

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
      console.log('[React-Queries] In switch case for chain:', chainId)

      try {
        console.log('[React-Queries] Step 1: Fetching opportunity IDs...')
        await fetchAllOpportunitiesIdsByChainId(dispatch, chainId)
        console.log('[React-Queries] Step 1 complete: IDs fetched')

        console.log('[React-Queries] Step 2: Fetching staking metadata...')
        await fetchAllStakingOpportunitiesMetadataByChainId(dispatch, chainId)
        console.log('[React-Queries] Step 2 complete: Metadata fetched')
      } catch (error) {
        console.error('[React-Queries] ERROR in fetchAll:', error)
        throw error
      }

      console.log('[React-Queries] After metadata fetch, checking accountId:', {
        hasAccountId: !!accountId,
        accountId,
      })
      if (accountId) {
        console.log('[React-Queries] Step 3: Fetching user data...')
        try {
          await fetchAllOpportunitiesUserDataByAccountId(dispatch, accountId)
          console.log('[React-Queries] Step 3 complete: User data fetched')
        } catch (error) {
          console.error('[React-Queries] ERROR fetching user data:', error)
          // Don't throw here - metadata is more important
        }
      } else {
        console.log('[React-Queries] No accountId provided, skipping user data fetch')
      }
      break
    default:
      console.log('[React-Queries] Unknown chain, skipping:', chainId)
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
    onAccountLoad?: (accountId: AccountId) => void,
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
            onAccountLoad?.(accountId)
          }),
        )

        // We *have* to return a value other than undefined from react-query queries, see
        // https://tanstack.com/query/v4/docs/react/guides/migrating-to-react-query-4#undefined-is-an-illegal-cache-value-for-successful-queries
        return null
      },
    }
  },
})
