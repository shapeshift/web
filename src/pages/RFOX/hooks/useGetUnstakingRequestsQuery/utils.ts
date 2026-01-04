import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { RFOX_ABI, viemClientByNetworkId } from '@shapeshiftoss/contracts'
import { getAddress } from 'viem'
import { multicall, readContract } from 'viem/actions'
import { arbitrum } from 'viem/chains'

import { getStakingContract } from '../../helpers'

import { getConfig } from '@/config'
import { loadRfoxUnstakingRequests } from '@/lib/graphql/dataLoaders'
import { fromBaseUnit } from '@/lib/math'
import { isSome } from '@/lib/utils'
import { selectAssetById } from '@/state/slices/selectors'
import { store } from '@/state/store'

const client = viemClientByNetworkId[arbitrum.id]

type UseGetUnstakingRequestsQueryProps = {
  stakingAssetAccountId: AccountId
  stakingAssetId: AssetId
}

export type UnstakingRequest = {
  amountCryptoPrecision: string
  amountCryptoBaseUnit: string
  cooldownExpiry: string
  stakingAssetId: AssetId
  index: number
  id: string
  stakingAssetAccountId: AccountId
}

export type UnstakingRequestAccountAssetData = {
  unstakingRequests: UnstakingRequest[]
  stakingAssetAccountId: AccountId
}

export const getUnstakingRequestsQueryFn = ({
  stakingAssetAccountId,
  stakingAssetId,
}: UseGetUnstakingRequestsQueryProps): (() => Promise<UnstakingRequestAccountAssetData>) => {
  const stakingAssetAccountAddress = fromAccountId(stakingAssetAccountId).account

  return async () => {
    const isGraphQLEnabled = getConfig().VITE_FEATURE_GRAPHQL_POC

    if (isGraphQLEnabled) {
      try {
        const result = await loadRfoxUnstakingRequests(stakingAssetAccountAddress, stakingAssetId)

        if (!result) {
          return { unstakingRequests: [], stakingAssetAccountId }
        }

        const stakingAsset = selectAssetById(store.getState(), stakingAssetId)
        if (!stakingAsset) {
          return { unstakingRequests: [], stakingAssetAccountId }
        }

        const unstakingRequests = result.unstakingRequests.map(req => ({
          amountCryptoBaseUnit: req.unstakingBalance,
          amountCryptoPrecision: fromBaseUnit(req.unstakingBalance, stakingAsset.precision),
          cooldownExpiry: req.cooldownExpiry,
          stakingAssetId,
          index: req.index,
          id: `${req.index}-${req.cooldownExpiry}-${result.contractAddress}`,
          stakingAssetAccountId,
        }))

        return { unstakingRequests, stakingAssetAccountId }
      } catch (error) {
        console.error('[getUnstakingRequests] GraphQL failed, falling back:', error)
      }
    }

    const count = await readContract(client, {
      abi: RFOX_ABI,
      address: getStakingContract(stakingAssetId),
      functionName: 'getUnstakingRequestCount',
      args: [getAddress(stakingAssetAccountAddress)],
    })

    const contractAddress = getStakingContract(stakingAssetId)

    const multicallParams = Array.from({ length: Number(count) }, (_, index) => {
      return {
        abi: RFOX_ABI,
        address: contractAddress,
        functionName: 'getUnstakingRequest',
        args: [getAddress(stakingAssetAccountAddress), BigInt(index)],
        chainId: arbitrum.id,
      } as const
    })

    const responses = await multicall(client, { contracts: multicallParams })
    const unstakingRequests = responses
      .map(({ result }, i) => {
        const stakingAsset = selectAssetById(store.getState(), stakingAssetId)

        if (!result) return null
        if (!stakingAsset) return null

        const currentContractAddress = multicallParams[i].address

        const index = Number(multicallParams[i].args[1])

        const amountCryptoBaseUnit = result.unstakingBalance.toString()

        return {
          amountCryptoBaseUnit,
          amountCryptoPrecision: fromBaseUnit(amountCryptoBaseUnit, stakingAsset.precision),
          cooldownExpiry: result.cooldownExpiry.toString(),
          stakingAssetId,
          index,
          id: `${index}-${result.cooldownExpiry}-${currentContractAddress}`,
          stakingAssetAccountId,
        }
      })
      .filter(isSome)

    return { unstakingRequests, stakingAssetAccountId }
  }
}
