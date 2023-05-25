import { createApi } from '@reduxjs/toolkit/dist/query/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { logger } from 'lib/logger'

import { BASE_RTK_CREATE_API_CONFIG } from '../const'
import { covalentApi } from '../covalent/covalentApi'
import { zapperApi } from '../zapper/zapperApi'
import type { NftCollectionItem, NftItem } from './types'

type GetNftUserTokensInput = {
  accountIds: AccountId[]
}

type GetNftCollectionInput = {
  collectionId: AssetId
  // This looks weird but is correct. We abuse the Zapper balances endpoint to get collection meta
  accountIds: AccountId[]
}

const moduleLogger = logger.child({ namespace: ['nftApi'] })

export const nftApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'nftApi',
  endpoints: build => ({
    getNftUserTokens: build.query<NftItem[], GetNftUserTokensInput>({
      queryFn: async ({ accountIds }, { dispatch }) => {
        const sources = [
          zapperApi.endpoints.getZapperNftUserTokens,
          covalentApi.endpoints.getCovalentNftUserTokens,
        ]

        const results = await Promise.all(
          sources.map(source => dispatch(source.initiate({ accountIds }))),
        )
        const data = results.reduce<NftItem[]>((acc, result) => {
          if (result.data) {
            const { data } = result
            acc = acc.concat(data)
          } else if (result.isError) {
            moduleLogger.error({ error: result.error }, 'Failed to fetch nft user data')
          }

          return acc
        }, [])

        return { data }
      },
    }),
    getNftCollection: build.query<NftCollectionItem, GetNftCollectionInput>({
      queryFn: async ({ collectionId, accountIds }, { dispatch }) => {
        const sources = [zapperApi.endpoints.getZapperCollectionBalance]

        // Only zapperApi.endpoints.getZapperCollectionBalance for now
        const { data } = await dispatch(sources[0].initiate({ accountIds, collectionId }))

        const collectionItem = data?.[0]

        if (!collectionItem)
          return {
            error: {
              status: 404,
              data: {
                message: 'Collection not found',
              },
            },
          }

        return { data: collectionItem }
      },
    }),
  }),
})

export const { useGetNftUserTokensQuery, useGetNftCollectionQuery } = nftApi
