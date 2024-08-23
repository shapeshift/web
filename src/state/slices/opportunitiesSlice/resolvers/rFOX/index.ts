import {
  foxOnArbitrumOneAssetId,
  fromAccountId,
  fromAssetId,
  thorchainAssetId,
} from '@shapeshiftoss/caip'
import { bn } from '@shapeshiftoss/chain-adapters'
import { RFOX_PROXY_CONTRACT_ADDRESS } from '@shapeshiftoss/contracts'
import type { MarketData } from '@shapeshiftoss/types'
import { fromBaseUnit } from '@shapeshiftoss/utils'
import { erc20Abi, getAddress } from 'viem'
import { readContract } from 'viem/actions'
import { arbitrum } from 'viem/chains'
import { viemClientByNetworkId } from 'lib/viem-client'
import { selectStakingBalance } from 'pages/RFOX/helpers'
import { getStakingInfoQueryFn } from 'pages/RFOX/hooks/useStakingInfoQuery'
import { selectAssetById, selectMarketDataByAssetIdUserCurrency } from 'state/slices/selectors'

import { rFOXStakingIds } from '../../constants'
import type {
  GetOpportunityIdsOutput,
  GetOpportunityMetadataOutput,
  GetOpportunityUserStakingDataOutput,
} from '../../types'
import { DefiProvider, DefiType } from '../../types'
import { serializeUserStakingId } from '../../utils'
import type { OpportunityMetadataResolverInput, OpportunityUserDataResolverInput } from '../types'

const client = viemClientByNetworkId[arbitrum.id]

const stakingAssetId = foxOnArbitrumOneAssetId
const stakingAssetAccountAddress = RFOX_PROXY_CONTRACT_ADDRESS

export const rFOXStakingMetadataResolver = async ({
  opportunityId,
  defiType,
  reduxApi,
}: OpportunityMetadataResolverInput): Promise<{
  data: GetOpportunityMetadataOutput
}> => {
  const { getState } = reduxApi
  const state: any = getState() // ReduxState causes circular dependency

  const stakingAsset = selectAssetById(state, stakingAssetId)

  const stakingAssetMarketData: MarketData = selectMarketDataByAssetIdUserCurrency(
    state,
    stakingAssetId,
  )

  const contractData = await readContract(client, {
    abi: erc20Abi,
    address: getAddress(fromAssetId(stakingAssetId).assetReference),
    functionName: 'balanceOf',
    args: [getAddress(stakingAssetAccountAddress)],
  })

  const tvl = bn(fromBaseUnit(contractData.toString(), stakingAsset?.precision ?? 0))
    .times(stakingAssetMarketData.price)
    .toFixed(2)

  const underlyingAssetIds = [foxOnArbitrumOneAssetId]

  const data = {
    byId: {
      [opportunityId]: {
        assetId: opportunityId,
        id: opportunityId,
        provider: DefiProvider.rFOX,
        type: DefiType.Staking,
        underlyingAssetId: foxOnArbitrumOneAssetId,
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

  return await Promise.resolve({ data })
}

export const rFOXStakingUserDataResolver = async ({
  opportunityId,
  accountId,
}: OpportunityUserDataResolverInput): Promise<{ data: GetOpportunityUserStakingDataOutput }> => {
  const stakingAssetAccountAddress = getAddress(fromAccountId(accountId).account)
  const userStakingId = serializeUserStakingId(accountId, opportunityId)

  const rfoxStakingInfo = await getStakingInfoQueryFn(stakingAssetAccountAddress)()
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
