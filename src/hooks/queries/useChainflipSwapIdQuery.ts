import type { SwapSource } from '@shapeshiftoss/swapper'
import { SwapperName } from '@shapeshiftoss/swapper'
import type { UseQueryResult } from '@tanstack/react-query'
import { skipToken, useQuery } from '@tanstack/react-query'
import axios from 'axios'

type UseChainflipSwapIdArgs = {
  txHash: string | undefined
  swapperName: SwapSource | undefined
}

type SwapIdResponse = {
  data: {
    txRefs: {
      nodes: {
        swap: {
          nativeId: string | undefined
        }
      }[]
    }
  }
}

export const useChainflipSwapIdQuery = ({
  txHash,
  swapperName,
}: UseChainflipSwapIdArgs): UseQueryResult<string | undefined, Error> => {
  return useQuery({
    queryKey: ['chainflipSwapId', { txHash }],
    queryFn:
      txHash && swapperName === SwapperName.Chainflip
        ? () =>
            // Yes, this is ugly, just another day in "we're doing inline raw GraphQL queries with http"
            // Note, this is undocumented but is actually the exact same query fragment CF UI uses to go from Tx hash to swap ID (though only a fragment of it,
            // actually stripped out to the bare minimum here vs. cf UI)
            axios.post<SwapIdResponse>('https://explorer-service-processor.chainflip.io/graphql', {
              query: `
          query GetStringSearchResults($searchString: String!) {
            txRefs: allTransactionRefs(filter: {ref: {equalTo: $searchString}}) {
              nodes {
                swap: swapRequestBySwapRequestId {
                  nativeId
                }
              }
            }
          }
      `,
              variables: {
                searchString: txHash,
              },
            })
        : skipToken,
    select: ({ data: { data } }) => data.txRefs.nodes[0].swap.nativeId,
    // Long-poll until swap by initiating Txid is indexed
    refetchInterval: 10_000,
  })
}
