import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { RFOX_ABI } from '@shapeshiftoss/contracts'
import { BigAmount } from '@shapeshiftoss/utils'
import { getAddress } from 'viem'
import { multicall, readContract } from 'viem/actions'

import { getRfoxClient, getRfoxNetworkId, getStakingContract } from '../../helpers'

import { isSome } from '@/lib/utils'
import { selectAssetById } from '@/state/slices/selectors'
import { store } from '@/state/store'

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

// Omitting the staking asset matches every program's requests for the account
export const getUnstakingRequestsQueryKey = ({
  stakingAssetAccountId,
  stakingAssetId,
}: {
  stakingAssetAccountId: AccountId
  stakingAssetId?: AssetId
}) =>
  [
    'getUnstakingRequests',
    stakingAssetId ? { stakingAssetAccountId, stakingAssetId } : { stakingAssetAccountId },
  ] as const

export const isUnstakingRequestClaimable = (
  unstakingRequest: UnstakingRequest,
  nowMs: number = Date.now(),
) => nowMs >= Number(unstakingRequest.cooldownExpiry) * 1000

export const getUnstakingRequestsQueryFn = ({
  stakingAssetAccountId,
  stakingAssetId,
}: UseGetUnstakingRequestsQueryProps): (() => Promise<UnstakingRequestAccountAssetData>) => {
  const stakingAssetAccountAddress = fromAccountId(stakingAssetAccountId).account
  const client = getRfoxClient(stakingAssetId)

  return async () => {
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
        chainId: getRfoxNetworkId(stakingAssetId),
      } as const
    })

    // A partial read would read as claimed requests, so fail the whole read instead
    const responses = await multicall(client, { contracts: multicallParams, allowFailure: false })

    const stakingAsset = selectAssetById(store.getState(), stakingAssetId)
    if (!stakingAsset) throw new Error(`Asset not found for ${stakingAssetId}`)

    const unstakingRequests = responses
      .map((result, i) => {
        if (!result) return null

        const contractAddress = multicallParams[i].address

        // getUnstakingRequest(account address, index uint256)
        const index = Number(multicallParams[i].args[1])

        const amountCryptoBaseUnit = result.unstakingBalance.toString()

        return {
          amountCryptoBaseUnit,
          amountCryptoPrecision: BigAmount.fromBaseUnit({
            value: amountCryptoBaseUnit,
            precision: stakingAsset.precision,
          }).toPrecision(),
          cooldownExpiry: result.cooldownExpiry.toString(),
          stakingAssetId,
          index,
          // The request's Unstake event, the index moves as other requests are claimed
          id: `${stakingAssetAccountId}-${contractAddress}-${result.cooldownExpiry}-${amountCryptoBaseUnit}`,
          stakingAssetAccountId,
        }
      })
      .filter(isSome)

    return { unstakingRequests, stakingAssetAccountId }
  }
}
