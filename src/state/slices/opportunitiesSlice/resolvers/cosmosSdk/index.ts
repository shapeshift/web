import { cosmosChainId, fromAccountId, osmosisChainId } from '@shapeshiftoss/caip'
import type { CosmosSdkBaseAdapter, CosmosSdkChainId } from '@shapeshiftoss/chain-adapters'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { logger } from 'lib/logger'
import { isFulfilled, isRejected, isSome } from 'lib/utils'
import type { ReduxState } from 'state/reducer'
import { selectFeatureFlags, selectWalletAccountIds } from 'state/slices/selectors'

import type { GetOpportunityIdsOutput } from '../../types'
import type { OpportunityIdsResolverInput } from '../types'
import { makeUniqueValidatorAccountIds } from './utils'

const moduleLogger = logger.child({ namespace: ['opportunities', 'resolvers', 'cosmosSdk'] })

export const cosmosSdkOpportunityIdsResolver = async ({
  reduxApi,
}: OpportunityIdsResolverInput): Promise<{
  data: GetOpportunityIdsOutput
}> => {
  const state = reduxApi.getState() as ReduxState

  const { CosmosSdkOpportunitiesAbstraction } = selectFeatureFlags(state)
  if (!CosmosSdkOpportunitiesAbstraction) {
    return { data: [] }
  }

  const chainAdapters = getChainAdapterManager()
  const portfolioAccountIds = selectWalletAccountIds(state)
  const cosmosSdkAccountIds = portfolioAccountIds.filter(accountId =>
    [cosmosChainId || osmosisChainId].includes(fromAccountId(accountId).chainId),
  )
  const cosmosSdkAccounts = await Promise.allSettled(
    cosmosSdkAccountIds.map(accountId => {
      const { account: pubKey, chainId } = fromAccountId(accountId)
      const adapter = chainAdapters.get(
        chainId,
      ) as unknown as CosmosSdkBaseAdapter<CosmosSdkChainId>
      return adapter.getAccount(pubKey)
    }),
  ).then(settledAccountsPromises =>
    settledAccountsPromises
      .map(settledAccount => {
        if (isRejected(settledAccount)) {
          moduleLogger.error(settledAccount.reason, 'Error fetching Cosmos SDK account')
          return undefined
        }
        if (isFulfilled(settledAccount)) return settledAccount.value

        return undefined // This will never happen, a Promise is either rejected or fullfilled
      })
      .filter(isSome),
  )

  const uniqueValidatorAccountIds = makeUniqueValidatorAccountIds(cosmosSdkAccounts)

  return {
    data: uniqueValidatorAccountIds,
  }
}
