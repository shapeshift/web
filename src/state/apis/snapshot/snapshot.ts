import { createApi } from '@reduxjs/toolkit/dist/query/react'
import { type AccountId, fromAccountId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
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
      queryFn: async (accountIds, { dispatch }) => {
        const strategiesResult = await dispatch(snapshotApi.endpoints.getStrategies.initiate())
        const strategies = strategiesResult?.data
        if (!strategies) {
          console.log('snapshotApi getVotingPower could not get strategies')
          return { data: bn(0).toString() }
        }
        const evmAddresses = Array.from(
          accountIds.reduce<Set<string>>((acc, accountId) => {
            const { account, chainId } = fromAccountId(accountId)
            isEvmChainId(chainId) && acc.add(account)
            return acc
          }, new Set()),
        )
        const delegation = true
        const votingPowerResults = await Promise.all(
          evmAddresses.map(async address => {
            const votingPowerUnvalidated = await snapshot.utils.getVp(
              address,
              '1', // TODO - aggregate by chain reference
              strategies,
              'latest', // TODO - implement delay
              SNAPSHOT_SPACE,
              delegation,
            )
            // vp is FOX in crypto balance
            return bnOrZero(VotingPowerSchema.parse(votingPowerUnvalidated).vp)
          }),
        )
        const data = votingPowerResults
          .reduce((acc, cur) => {
            return acc.plus(cur)
          }, bn(0))
          .toString()
        console.log('addresses', evmAddresses)
        console.log('FOX voting power', data)
        return { data }
      },
    }),
  }),
})

export const { useGetVotingPowerQuery } = snapshotApi
