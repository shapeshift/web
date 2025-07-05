import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { skipToken } from '@tanstack/react-query'
import type { Address } from 'viem'
import { getAddress } from 'viem'
import { arbitrum } from 'viem/chains'

import { getRfoxContract } from '../constants'
import { getStakingContract } from '../helpers'

type EarnedQueryKey = [
  'earned',
  {
    chainId: number
    contractAddress: Address
    stakingAssetAccountId?: AccountId
    stakingAssetId: AssetId
  },
]

type UseEarnedQueryProps = {
  stakingAssetAccountId: AccountId | undefined
  stakingAssetId: AssetId
}

export const getEarnedQueryKey = ({
  stakingAssetAccountId,
  stakingAssetId,
}: UseEarnedQueryProps): EarnedQueryKey => [
  'earned',
  {
    chainId: arbitrum.id,
    contractAddress: getStakingContract(stakingAssetId),
    stakingAssetAccountId,
    stakingAssetId,
  },
]

export const getEarnedQueryFn = ({
  stakingAssetAccountId,
  stakingAssetId,
}: UseEarnedQueryProps) => {
  if (!stakingAssetId) return skipToken
  if (!stakingAssetAccountId) return skipToken

  return async () => {
    try {
      return await getRfoxContract(stakingAssetId).read.earned([
        getAddress(fromAccountId(stakingAssetAccountId).account),
      ])
    } catch (err) {
      console.error(err)
      return 0n
    }
  }
}
