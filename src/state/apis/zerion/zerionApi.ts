import { createApi } from '@reduxjs/toolkit/dist/query/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import axios from 'axios'
import { getConfig } from 'config'
import { BASE_RTK_CREATE_API_CONFIG } from 'state/apis/const'

const ZERION_BASE_URL = 'https://api.zerion.io/v1'

const options = {
  method: 'GET' as const,
  url: ZERION_BASE_URL,
  headers: {
    accept: 'application/json',
    authorization: `Basic ${getConfig().REACT_APP_ZERION_API_KEY}`,
  },
}

// https://developers.zerion.io
export const zerionApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'zerionApi',
  endpoints: build => ({
    getChains: build.query<void, void>({
      queryFn: async () => {
        const url = `${ZERION_BASE_URL}/chains`
        const { data } = await axios.request({ ...options, url })
        return { data }
      },
    }),
    getWalletPositions: build.query<void, AccountId>({
      queryFn: async accountId => {
        const { chainId, account } = fromAccountId(accountId)
        if (isEvmChainId(chainId)) {
          throw new Error(`getWalletPositions: unsupported chainId: ${chainId} (EVM only)`)
        }
        // zerion is honey badger - it doesn't give a fuck about chainId, EVM only
        const url = `${ZERION_BASE_URL}/wallets/${account}/positions/`
        const { data } = await axios.request({ ...options, url })
        return { data }
      },
    }),
  }),
})

export const { useGetChainsQuery, useGetWalletPositionsQuery } = zerionApi
