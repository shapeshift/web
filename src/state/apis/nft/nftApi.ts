import { createApi } from '@reduxjs/toolkit/dist/query/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { logger } from 'lib/logger'

import { BASE_RTK_CREATE_API_CONFIG } from '../const'
import { covalentApi } from '../covalent/covalentApi'
import type { V2NftUserItem } from '../zapper/validators'
import { zapperApi } from '../zapper/zapperApi'

type GetNftUserTokensInput = {
  accountIds: AccountId[]
}

const moduleLogger = logger.child({ namespace: ['nftApi'] })

// TODO(gomes): maybe uncomment me if we need it
// export const nftApi = createApi()

export const nftApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'nftApi',
  endpoints: build => ({
    getNftUserTokens: build.query<V2NftUserItem[], GetNftUserTokensInput>({
      queryFn: async ({ accountIds }, { dispatch }) => {
        try {
          const { data: zapperData } = await dispatch(
            zapperApi.endpoints.getZapperNftUserTokens.initiate({
              accountIds,
            }),
          )
          const { data: covalentData } = await dispatch(
            covalentApi.endpoints.getCovalentNftUserTokens.initiate({
              accountIds,
            }),
          )

          const data = (zapperData ?? []).concat(covalentData ?? [])

          return { data }
        } catch (error) {
          debugger
        }
      },
    }),
  }),
})

export const { useGetNftUserTokensQuery } = nftApi
