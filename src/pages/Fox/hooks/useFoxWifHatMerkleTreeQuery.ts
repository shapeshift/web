import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { useMemo } from 'react'
import { IPFS_GATEWAY } from 'pages/RFOX/constants'

export type FoxWifHatClaimQuote = { index: bigint; amount: string; proof: `0x${string}`[] }

type MerkleData = {
  merkleRoot: string
  tokenTotal: string
  claims: Record<string, FoxWifHatClaimQuote>
}

type FoxWifHatMerkleTreeQueryKey = ['foxWifHatMerkleTree']

const MERKLE_TREE_HASH = 'bafybeifaysj3qdmwrjlkc7pebbutjj7qdtyfofxxqdgyar2xzyrqy3d2ui'

export const getFoxWifHatMerkleTreeQueryKey = (): FoxWifHatMerkleTreeQueryKey => [
  'foxWifHatMerkleTree',
]

export const fetchFoxWifhatMerkleTree = async (): Promise<MerkleData> => {
  const { data } = await axios.get<MerkleData>(`${IPFS_GATEWAY}/${MERKLE_TREE_HASH}`)

  const lowercasedClaims = Object.entries(data.claims).reduce(
    (acc, [address, claim]) => {
      acc[address.toLowerCase()] = claim
      return acc
    },
    {} as typeof data.claims,
  )

  return {
    ...data,
    claims: lowercasedClaims,
  }
}

export const useFoxWifHatMerkleTreeQuery = () => {
  const queryKey = useMemo(() => getFoxWifHatMerkleTreeQueryKey(), [])

  const queryFn = useMemo(() => () => fetchFoxWifhatMerkleTree(), [])

  return useQuery({
    queryKey,
    queryFn,
    staleTime: Infinity, // This merkle tree will never change
    gcTime: Infinity,
  })
}
