import { SwapperName } from '@shapeshiftoss/swapper'
import type { UseQueryResult } from '@tanstack/react-query'
import { skipToken, useQuery } from '@tanstack/react-query'
import axios from 'axios'

type UseChainflipSwapIdArgs = {
  txHash: string | undefined
  swapperName: SwapperName | undefined
}

type SwapIdResponse = {
  data: {
    txRefs: {
      nodes: {
        swap: {
          nativeId: string | undefined
        } | null
      }[]
    }
  }
}

const nativeSwapIdQuery = `
  query GetStringSearchResults($searchString: String!) {
    txRefs: allTransactionRefs(filter: {ref: {equalTo: $searchString}}) {
      nodes {
        swap: swapRequestBySwapRequestId {
          nativeId
        }
      }
    }
  }
`

export const chainflipSwapIdQueryKey = (txHash: string) => ['chainflipSwapId', { txHash }] as const

export const selectLatestChainflipSwapId = (response: SwapIdResponse): string | undefined => {
  const nodes = response.data.txRefs.nodes

  for (let i = nodes.length - 1; i >= 0; i--) {
    const nativeId = nodes[i]?.swap?.nativeId
    if (nativeId) return nativeId
  }

  return undefined
}

export const fetchChainflipSwapIdByTxHash = async (txHash: string): Promise<string | undefined> => {
  const { data } = await axios.post<SwapIdResponse>(
    'https://explorer-service-processor.chainflip.io/graphql',
    {
      query: nativeSwapIdQuery,
      variables: {
        searchString: txHash,
      },
    },
  )

  return selectLatestChainflipSwapId(data)
}

export const useChainflipSwapIdQuery = ({
  txHash,
  swapperName,
}: UseChainflipSwapIdArgs): UseQueryResult<string | undefined, Error> => {
  return useQuery({
    queryKey: txHash ? chainflipSwapIdQueryKey(txHash) : ['chainflipSwapId', { txHash }],
    queryFn:
      txHash && swapperName === SwapperName.Chainflip
        ? () => fetchChainflipSwapIdByTxHash(txHash)
        : skipToken,
    // Long-poll until swap by initiating Txid is indexed
    refetchInterval: 10_000,
  })
}
