import { createApi } from '@reduxjs/toolkit/dist/query/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { logger } from 'lib/logger'

import { BASE_RTK_CREATE_API_CONFIG } from '../const'
import type { V2NftUserItem } from '../zapper/validators'
import { zapperApi } from '../zapper/zapperApi'

type GetNftUserTokensInput = {
  accountIds: AccountId[]
}

const moduleLogger = logger.child({ namespace: ['nftApi'] })

export const nftApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'nftApi',
  endpoints: build => ({
    getNftUserTokens: build.query<V2NftUserItem[], GetNftUserTokensInput>({
      queryFn: async ({ accountIds }, { dispatch }) => {
        const { data: zapperData } = await dispatch(
          zapperApi.endpoints.getZapperNftUserTokens.initiate({
            accountIds,
          }),
        ).catch((error: unknown) => {
          moduleLogger.error({ error }, 'Failed to fetch zapper nft user tokens')
          return { data: [] }
        })

        const data = zapperData!

        return { data }
      },
    }),
  }),
})

export const { useGetNftUserTokensQuery } = nftApi
