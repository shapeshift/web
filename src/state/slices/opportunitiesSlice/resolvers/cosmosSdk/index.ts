import { cosmosChainId, fromAccountId } from '@shapeshiftoss/caip'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { isFulfilled, isRejected, isSome } from 'lib/utils'
import { accountIdToFeeAssetId } from 'lib/utils/accounts'
import { assertGetCosmosSdkChainAdapter } from 'lib/utils/cosmosSdk'
import type { ReduxState } from 'state/reducer'
import { selectAssetById } from 'state/slices/assetsSlice/selectors'
import { selectWalletAccountIds } from 'state/slices/common-selectors'
import { selectMarketDataByAssetIdUserCurrency } from 'state/slices/marketDataSlice/selectors'

import type {
  GetOpportunityIdsOutput,
  GetOpportunityMetadataOutput,
  GetOpportunityUserStakingDataOutput,
  OpportunitiesState,
  OpportunityMetadata,
  StakingId,
} from '../../types'
import { DefiProvider, DefiType } from '../../types'
import type {
  OpportunitiesMetadataResolverInput,
  OpportunitiesUserDataResolverInput,
  OpportunityIdsResolverInput,
} from '../types'
import { makeAccountUserData, makeUniqueValidatorAccountIds } from './utils'

export const cosmosSdkOpportunityIdsResolver = async ({
  reduxApi,
}: OpportunityIdsResolverInput): Promise<{
  data: GetOpportunityIdsOutput
}> => {
  const state = reduxApi.getState() as ReduxState

  const portfolioAccountIds = selectWalletAccountIds(state)

  const cosmosSdkChainIdsWhitelist = [cosmosChainId]
  // Not AccountIds of all Cosmos SDK chains but only a subset of current and future Cosmos SDK chains we support/may support
  // We can't just check the chainNamespace, since this includes Thorchain and possibly future chains which don't use the regular Cosmos SDK staking module
  const cosmosSdkAccountIds = portfolioAccountIds.filter(accountId =>
    cosmosSdkChainIdsWhitelist.includes(fromAccountId(accountId).chainId),
  )
  const cosmosSdkAccounts = await Promise.allSettled(
    cosmosSdkAccountIds.map(accountId => {
      const { account: pubKey, chainId } = fromAccountId(accountId)
      const adapter = assertGetCosmosSdkChainAdapter(chainId)
      return adapter.getAccount(pubKey)
    }),
  ).then(settledAccountsPromises =>
    settledAccountsPromises
      .map(settledAccount => {
        if (isRejected(settledAccount)) {
          console.error(settledAccount.reason)
          return undefined
        }
        if (isFulfilled(settledAccount)) return settledAccount.value

        return undefined // This will never happen, a Promise is either rejected or fullfilled
      })
      .filter(isSome),
  )

  const uniqueValidatorAccountIds = makeUniqueValidatorAccountIds({
    cosmosSdkAccounts,
  })

  return {
    data: uniqueValidatorAccountIds,
  }
}

export const cosmosSdkStakingOpportunitiesMetadataResolver = async ({
  opportunityIds: validatorIds = [],
  defiType,
  reduxApi,
}: OpportunitiesMetadataResolverInput): Promise<{
  data: GetOpportunityMetadataOutput
}> => {
  const state = reduxApi.getState() as ReduxState
  const metadataByValidatorId = await Promise.allSettled(
    validatorIds.map(async validatorId => {
      const { account: validatorAddress, chainId } = fromAccountId(validatorId)

      try {
        const adapter = assertGetCosmosSdkChainAdapter(chainId)

        const data = await adapter.getValidator(validatorAddress)

        if (!data) throw new Error(`No validator data for address: ${validatorAddress}`)

        const assetId = accountIdToFeeAssetId(validatorId)
        if (!assetId) throw new Error(`No feeAssetId found for ValidatorAddress: ${validatorId}`)

        const asset = selectAssetById(state, assetId)
        if (!asset) throw new Error(`No asset found for AssetId: ${assetId}`)
        const marketData = selectMarketDataByAssetIdUserCurrency(state, assetId)

        const underlyingAssetRatioBaseUnit = bn(1).times(bn(10).pow(asset.precision)).toString()

        const cosmostationChainName = (() => {
          switch (chainId) {
            case cosmosChainId:
              return 'cosmoshub'
            default:
              return ''
          }
        })()

        return {
          validatorId,
          id: validatorId,
          apy: data.apr,
          icon: `https://raw.githubusercontent.com/cosmostation/cosmostation_token_resource/master/moniker/${cosmostationChainName}/${validatorAddress}.png`,
          tvl: bnOrZero(data.tokens)
            .div(bn(10).pow(asset.precision))
            .times(bnOrZero(marketData?.price))
            .toString(),

          name: data.moniker,
          type: DefiType.Staking,
          provider: DefiProvider.CosmosSdk,
          assetId,
          underlyingAssetId: assetId,
          underlyingAssetIds: [assetId],
          underlyingAssetRatiosBaseUnit: [underlyingAssetRatioBaseUnit] as const,
          // TODO: Handle different denom rewards
          rewardAssetIds: [assetId] as const,
          isClaimableRewards: true,
        }
      } catch (err) {
        if (err instanceof Error) {
          throw new Error(`failed to get data for validator: ${validatorAddress}: ${err.message}`)
        }
      }
    }),
  ).then(settledValidatorPromises =>
    settledValidatorPromises.reduce<Record<StakingId, OpportunityMetadata>>(
      (acc, settledValidatorPromise) => {
        if (isRejected(settledValidatorPromise)) {
          console.error(settledValidatorPromise.reason)
        }
        if (isFulfilled(settledValidatorPromise) && settledValidatorPromise.value) {
          const { validatorId, ...opportunityMetadata } = settledValidatorPromise.value

          acc[validatorId] = opportunityMetadata
        }

        return acc
      },
      {},
    ),
  )
  const data = {
    byId: metadataByValidatorId,
    type: defiType,
  }

  return { data }
}
export const cosmosSdkStakingOpportunitiesUserDataResolver = async ({
  opportunityIds: validatorIds,
  defiType,
  accountId,
  reduxApi,
  onInvalidate,
}: OpportunitiesUserDataResolverInput): Promise<{ data: GetOpportunityUserStakingDataOutput }> => {
  const { getState } = reduxApi
  const state: any = getState() // ReduxState causes circular dependency

  const emptyStakingOpportunitiesUserDataByUserStakingId: OpportunitiesState['userStaking']['byId'] =
    {}

  try {
    const { account: pubKey, chainId } = fromAccountId(accountId)
    if (chainId !== cosmosChainId) {
      return Promise.resolve({
        data: { byId: emptyStakingOpportunitiesUserDataByUserStakingId, type: defiType },
      })
    }

    const adapter = assertGetCosmosSdkChainAdapter(chainId)

    const cosmosAccount = await adapter.getAccount(pubKey)
    const assetId = accountIdToFeeAssetId(accountId)

    if (!assetId) throw new Error(`Cannot get AssetId for AccountId: ${accountId}`)

    const asset = selectAssetById(state, assetId)
    if (!asset) throw new Error(`Cannot get asset for AssetId: ${assetId}`)

    const byId = makeAccountUserData({
      cosmosSdkAccount: cosmosAccount,
      validatorIds,
      onInvalidate,
    })

    return Promise.resolve({ data: { byId, type: defiType } })
  } catch (e) {
    return Promise.resolve({
      data: {
        byId: emptyStakingOpportunitiesUserDataByUserStakingId,
        type: defiType,
      },
    })
  }
}
