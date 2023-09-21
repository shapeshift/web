import { createApi } from '@reduxjs/toolkit/dist/query/react'
import type { AccountId } from '@shapeshiftoss/caip'

import { BASE_RTK_CREATE_API_CONFIG } from '../const'

// todo
type SnapshotStrategies = {}

// todo
type SnapshotVotingPower = {}
type SnapshotVotingPowerArgs = AccountId[]

export const snapshotApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'snapshotApi',
  endpoints: build => ({
    getStrategies: build.query<SnapshotStrategies, void>({
      keepUnusedDataFor: Number.MAX_SAFE_INTEGER, // never refetch these
      queryFn: async () => {
        const data = {}
        return await Promise.resolve({ data })
      },
    }),
    getVotingPower: build.query<SnapshotVotingPower, SnapshotVotingPowerArgs>({
      keepUnusedDataFor: Number.MAX_SAFE_INTEGER, // never refetch these
      queryFn: async () => {
        const data = {}
        return await Promise.resolve({ data })
      },
    }),
  }),
})
