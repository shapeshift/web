import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { RFOX_ABI, viemClientByNetworkId } from '@shapeshiftoss/contracts'
import { getAddress } from 'viem'
import { multicall, readContract } from 'viem/actions'
import { arbitrum } from 'viem/chains'

import { getStakingContract } from '../../helpers'

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

        const contractAddress = multicallParams[i].address

        // getUnstakingRequest(account address, index uint256)
        const index = Number(multicallParams[i].args[1])

        const amountCryptoBaseUnit = result.unstakingBalance.toString()

        return {
          amountCryptoBaseUnit,
          amountCryptoPrecision: fromBaseUnit(amountCryptoBaseUnit, stakingAsset.precision),
          cooldownExpiry: result.cooldownExpiry.toString(),
          stakingAssetId,
          index,
          // composite ID to ensure uniqueness of unstaking requests, to be used for lookups
          // cooldownExpiry should be a unique enough index, since it's based on blockTime, and users are *not* going to be able to make
          // two unstaking requests in one block. But for the sake of paranoia, we make it a composite ID with index too
          // Which itself *is* unique at any given time, though as users unstake/claim, it may change due to the inner workings of solidity, as
          // indexes can reorg
          id: `${index}-${result.cooldownExpiry}-${contractAddress}`,
          stakingAssetAccountId,
        }
      })
      .filter(isSome)

    return { unstakingRequests, stakingAssetAccountId }
  }
}
