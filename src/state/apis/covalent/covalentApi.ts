import { createApi } from '@reduxjs/toolkit/query/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { polygonChainId } from '@shapeshiftoss/caip'
import type { AxiosRequestConfig } from 'axios'
import axios from 'axios'
import { getConfig } from 'config'
import { logger } from 'lib/logger'
import { selectFeatureFlag } from 'state/slices/selectors'

import { BASE_RTK_CREATE_API_CONFIG } from '../const'
import { accountIdsToEvmAddresses } from '../nft/utils'
import type { V2NftUserItem } from '../zapper/validators'
import type { CovalentNftUserTokensResponseType } from './validators'
import { chainIdToCovalentNetwork, parseToV2NftUserItem } from './validators'

const COVALENT_BASE_URL = 'https://api.covalenthq.com/v1'

const options: AxiosRequestConfig = {
  method: 'GET',
  baseURL: COVALENT_BASE_URL,
  headers: {
    accept: 'application/json',
  },
}

type GetCovalentNftUserTokensInput = {
  accountIds: AccountId[]
}

const moduleLogger = logger.child({ namespace: ['covalentApi'] })

export const covalentApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'covalentApi',
  endpoints: builder => ({
    getCovalentNftUserTokens: builder.query<V2NftUserItem[], GetCovalentNftUserTokensInput>({
      queryFn: async ({ accountIds }, { getState }) => {
        const isCovalentEnabled = selectFeatureFlag(getState() as any, 'CovalentJaypegs')

        if (!isCovalentEnabled) return { data: [] }

        // Covalent is used only for Polygon NFTs for now
        const chainId = polygonChainId
        const network = chainIdToCovalentNetwork(chainId)
        const data: V2NftUserItem[] = []
        const limit = 100

        const userAddresses = accountIdsToEvmAddresses(accountIds)
        for (const address of userAddresses) {
          try {
            const url = `/${network}/address/${address}/balances_v2/?key=${
              getConfig().REACT_APP_COVALENT_API_KEY
            }&nft=true`

            const payload = { ...options, url }
            const response = await axios.request<CovalentNftUserTokensResponseType>(payload)
            const res = response.data

            if (res.data.items?.length) {
              const v2NftUserItems = res.data.items
                // We're only interested in NFTs here
                .filter(({ nft_data, type }) => type === 'nft' && nft_data?.length)
                .map(item => parseToV2NftUserItem(item, chainId))
              data.push(...v2NftUserItems)
              if (res.data.items.length < limit) {
                break
              }
            }
          } catch (e) {
            moduleLogger.warn(e, 'getCovalentNftUserTokens error')
            break
          }
        }

        return { data }
      },
    }),
  }),
})
