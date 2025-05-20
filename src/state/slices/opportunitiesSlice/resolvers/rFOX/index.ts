import { fromAccountId, fromAssetId, thorchainAssetId } from '@shapeshiftoss/caip'
import { bn, bnOrZero } from '@shapeshiftoss/chain-adapters'
import { RFOX_PROXY_CONTRACT, viemClientByNetworkId } from '@shapeshiftoss/contracts'
import { fromBaseUnit } from '@shapeshiftoss/utils'
import { erc20Abi, getAddress } from 'viem'
import { readContract } from 'viem/actions'
import { arbitrum } from 'viem/chains'

import { rFOXStakingIds } from '../../constants'
import type {
  GetOpportunityIdsOutput,
  GetOpportunityMetadataOutput,
  GetOpportunityUserStakingDataOutput,
} from '../../types'
import { DefiProvider, DefiType } from '../../types'
import { serializeUserStakingId } from '../../utils'
import type { OpportunityMetadataResolverInput, OpportunityUserDataResolverInput } from '../types'

import { selectStakingBalance } from '@/pages/RFOX/helpers'
import { getStakingInfoQueryFn } from '@/pages/RFOX/hooks/useStakingInfoQuery'
import { selectAssetById, selectMarketDataByAssetIdUserCurrency } from '@/state/slices/selectors'

const client = viemClientByNetworkId[arbitrum.id]

const stakingAssetAccountAddress = RFOX_PROXY_CONTRACT

export const rFOXStakingMetadataResolver = async ({
  opportunityId,
  defiType,
  reduxApi,
}: OpportunityMetadataResolverInput): Promise<{
  data: GetOpportunityMetadataOutput
}> => {
  const { getState } = reduxApi
  const state: any = getState() // ReduxState causes circular dependency

  const stakingAsset = selectAssetById(state, opportunityId)

  const stakingAssetMarketData = selectMarketDataByAssetIdUserCurrency(state, opportunityId)

  const contractData = await readContract(client, {
    abi: erc20Abi,
    address: getAddress(fromAssetId(opportunityId).assetReference),
    functionName: 'balanceOf',
    args: [getAddress(stakingAssetAccountAddress)],
  })

  const tvl = bn(fromBaseUnit(contractData.toString(), stakingAsset?.precision ?? 0))
    .times(bnOrZero(stakingAssetMarketData?.price))
    .toFixed(2)

  const underlyingAssetIds = [opportunityId]

  const data = {
    byId: {
      [opportunityId]: {
        assetId: opportunityId,
        id: opportunityId,
        provider: DefiProvider.rFOX,
        type: DefiType.Staking,
        underlyingAssetId: opportunityId,
        underlyingAssetIds,
        underlyingAssetRatiosBaseUnit: [
          bn(1)
            .times(bn(10).pow(stakingAsset?.precision ?? 0))
            .toString(),
        ] as const,
        expired: false,
        name: 'rFOX',
        apy: undefined,
        tvl,
        rewardAssetIds: [thorchainAssetId] as const,
        isClaimableRewards: true,
      },
    },
    type: defiType,
  } as const

  return { data }
}

export const rFOXStakingUserDataResolver = async ({
  opportunityId,
  accountId,
}: OpportunityUserDataResolverInput): Promise<{ data: GetOpportunityUserStakingDataOutput }> => {
  const stakingAssetAccountAddress = getAddress(fromAccountId(accountId).account)
  const userStakingId = serializeUserStakingId(accountId, opportunityId)

  const rfoxStakingInfo = await getStakingInfoQueryFn({
    stakingAssetAccountAddress,
    stakingAssetId: opportunityId,
  })

  const stakedAmountCryptoBaseUnit = selectStakingBalance(rfoxStakingInfo)

  // TODO: Implement rewards
  const rewardsCryptoBaseUnit = { amounts: ['0'] as [string], claimable: true }

  const data = {
    byId: {
      [userStakingId]: {
        isLoaded: true,
        userStakingId,
        stakedAmountCryptoBaseUnit,
        rewardsCryptoBaseUnit,
      },
    },
    type: DefiType.Staking,
  }

  return { data }
}

export const rFOXStakingOpportunityIdsResolver = (): Promise<{
  data: GetOpportunityIdsOutput
}> => Promise.resolve({ data: [...rFOXStakingIds] })
