import { createApi } from '@reduxjs/toolkit/dist/query/react'
import type { AccountId } from '@shapeshiftoss/caip'
import snapshot from '@snapshot-labs/snapshot.js'
import axios from 'axios'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'

import { BASE_RTK_CREATE_API_CONFIG } from '../const'
import type { Strategy } from './validators'
import { SnapshotSchema, VotingPowerSchema } from './validators'

type SnapshotVotingPowerArgs = AccountId[]
type FoxVotingPowerCryptoBalance = string

const SNAPSHOT_SPACE = 'shapeshiftdao.eth'

export const snapshotApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'snapshotApi',
  endpoints: build => ({
    getStrategies: build.query<Strategy[], void>({
      keepUnusedDataFor: Number.MAX_SAFE_INTEGER, // never refetch these
      queryFn: async () => {
        const query = `
          query {
            space(id: "shapeshiftdao.eth") {
              strategies {
                name
                network
                params
              }
            }
          }
        `
        const { data: resData } = await axios.post(
          'https://hub.snapshot.org/graphql',
          { query },
          { headers: { Accept: 'application/json' } },
        )
        try {
          const { strategies } = SnapshotSchema.parse(resData).data.space
          console.log('###', strategies)
          return { data: strategies }
        } catch (e) {
          console.error('### snapshotApi getStrategies', e)
          return { data: [] }
        }
      },
    }),
    getVotingPower: build.query<FoxVotingPowerCryptoBalance, SnapshotVotingPowerArgs>({
      queryFn: async (_, { dispatch }) => {
        const strategiesResult = await dispatch(snapshotApi.endpoints.getStrategies.initiate())
        const strategies = strategiesResult?.data
        if (!strategies) {
          console.log('snapshotApi getVotingPower could not get strategies')
          return { data: bn(0).toString() }
        }
        const address = '0xa44c286ba83bb771cd0107b2c1df678435bd1535'
        const delegation = true
        const votingPowerUnvalidated = await snapshot.utils.getVp(
          address,
          '1',
          strategies,
          'latest',
          SNAPSHOT_SPACE,
          delegation,
        )
        const { vp: foxCryptoBalance } = VotingPowerSchema.parse(votingPowerUnvalidated)
        const data = bnOrZero(foxCryptoBalance).toString()
        console.log('FOXvoting power', data)
        return { data }
      },
    }),
  }),
})

export const { useGetVotingPowerQuery } = snapshotApi
