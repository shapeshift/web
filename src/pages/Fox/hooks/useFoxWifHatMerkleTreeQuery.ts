import type { AccountId } from '@shapeshiftoss/caip'
import { foxWifHatAssetId, fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { useCallback, useMemo } from 'react'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { IPFS_GATEWAY } from 'pages/RFOX/constants'
import { selectAccountIdsByChainId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export type FoxWifHatClaim = { index: bigint; amount: string; proof: `0x${string}`[] }

type MerkleData = {
  merkleRoot: string
  tokenTotal: string
  claims: Record<string, FoxWifHatClaim>
}

type FoxWifHatMerkleTreeQueryKey = ['foxWifHatMerkleTree']

const MERKLE_TREE_HASH = 'bafybeifaysj3qdmwrjlkc7pebbutjj7qdtyfofxxqdgyar2xzyrqy3d2ui'

export const getFoxWifHatMerkleTreeQueryKey = (): FoxWifHatMerkleTreeQueryKey => [
  'foxWifHatMerkleTree',
]

export const fetchFoxWifhatMerkleTree = async (): Promise<MerkleData> => {
  const { data } = await axios.get<MerkleData>(`${IPFS_GATEWAY}/${MERKLE_TREE_HASH}`)

  return data
}

export const useFoxWifHatMerkleTreeQuery = () => {
  const accountIdsByChainId = useAppSelector(selectAccountIdsByChainId)
  const queryKey = useMemo(() => getFoxWifHatMerkleTreeQueryKey(), [])

  const queryFn = useMemo(() => () => fetchFoxWifhatMerkleTree(), [])

  const selectClaimByAccountId = useCallback(
    (data: MerkleData) => {
      const claimByAccountId = Object.entries(data.claims).reduce(
        (acc, [address, claim]) => {
          const accountId = accountIdsByChainId[fromAssetId(foxWifHatAssetId).chainId]?.find(
            accountId => fromAccountId(accountId).account === address.toLowerCase(),
          )
          if (!accountId) return acc

          acc[accountId] = {
            ...claim,
            amount: bnOrZero(claim.amount).toFixed(),
          }

          return acc
        },
        {} as Record<AccountId, FoxWifHatClaim>,
      )

      if (Object.keys(claimByAccountId).length === 0) return null

      return claimByAccountId
    },
    [accountIdsByChainId],
  )

  return useQuery({
    queryKey,
    queryFn,
    staleTime: Infinity, // This merkle tree will never change
    gcTime: Infinity,
    select: selectClaimByAccountId,
  })
}
