import { foxAssetId, foxOnArbitrumOneAssetId, fromAccountId } from '@shapeshiftoss/caip'
import { getAddress } from 'viem'
import { selectStakingBalance } from 'pages/RFOX/helpers'
import { getReadStakingInfoQueryFn } from 'pages/RFOX/hooks/useStakingInfoQuery'

import { rFOXEthStakingIds } from '../../constants'
import type {
  GetOpportunityIdsOutput,
  GetOpportunityMetadataOutput,
  GetOpportunityUserStakingDataOutput,
} from '../../types'
import { DefiProvider, DefiType } from '../../types'
import { serializeUserStakingId } from '../../utils'
import type { OpportunityMetadataResolverInput, OpportunityUserDataResolverInput } from '../types'

export const rFOXStakingMetadataResolver = async ({
  opportunityId,
  defiType,
}: OpportunityMetadataResolverInput): Promise<{
  data: GetOpportunityMetadataOutput
}> => {
  const data = {
    byId: {
      [opportunityId]: {
        assetId: opportunityId,
        id: opportunityId,
        provider: DefiProvider.rFOX,
        type: DefiType.Staking,
        underlyingAssetId: foxOnArbitrumOneAssetId,
        underlyingAssetIds: [foxOnArbitrumOneAssetId],
        underlyingAssetRatiosBaseUnit: ['1', '1'] as const,
        expired: false,
        name: 'rFOX',
        rewardAssetIds: [foxAssetId] as const,
        isClaimableRewards: true,
      },
    },
    type: defiType,
  } as const

  return await Promise.resolve({ data })
}

export const rFOXStakingUserDataResolver = async ({
  opportunityId,
  accountId,
}: OpportunityUserDataResolverInput): Promise<{ data: GetOpportunityUserStakingDataOutput }> => {
  const { account } = fromAccountId(accountId)
  const accountAddress = getAddress(account)

  const userStakingId = serializeUserStakingId(accountId, opportunityId)

  const rfoxStakingInfo = await getReadStakingInfoQueryFn(accountAddress, undefined)()
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
}> => Promise.resolve({ data: [...rFOXEthStakingIds] })
