import { createApi } from '@reduxjs/toolkit/query/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { polygonChainId } from '@shapeshiftoss/caip'
import type { AxiosRequestConfig } from 'axios'
import axios from 'axios'
import { getConfig } from 'config'
import { selectFeatureFlag } from 'state/slices/selectors'

import { BASE_RTK_CREATE_API_CONFIG } from '../const'
import { parseToNftItem } from '../nft/parsers/covalent'
import type { NftItemWithCollection } from '../nft/types'
import { accountIdsToEvmAddresses } from '../nft/utils'
import type { CovalentNftUserTokensResponseType } from './validators'
import { chainIdToCovalentNetwork, covalentNetworkToChainId } from './validators'

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

export const covalentApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'covalentApi',
  endpoints: builder => ({
    getCovalentNftUserTokens: builder.query<NftItemWithCollection[], GetCovalentNftUserTokensInput>(
      {
        queryFn: async ({ accountIds }, { getState }) => {
          const isCovalentEnabled = selectFeatureFlag(getState() as any, 'CovalentJaypegs')

          if (!isCovalentEnabled) return { data: [] }

          // Covalent is used only for Polygon NFTs for now
          const chainId = polygonChainId
          const network = chainIdToCovalentNetwork(chainId)
          let data: NftItemWithCollection[] = []
          const limit = 100

          const userAddresses = accountIdsToEvmAddresses(accountIds)
          for (const address of userAddresses) {
            try {
              const url = `/${network}/address/${address}/balances_v2/?key=${
                getConfig().REACT_APP_COVALENT_API_KEY
              }&nft=true&x-allow-incomplete=true&no-spam=true`

              const payload = { ...options, url }
              const response = await axios.request<CovalentNftUserTokensResponseType>(payload)
              const res = response.data

              if (res.data.items?.length) {
                const nftUserItems = res.data.items
                  .filter(({ nft_data, type }) => type === 'nft' && nft_data?.length)
                  .flat()
                const parsedData = nftUserItems.flatMap(nftUserItem => {
                  // Actually defined since we're passing supported EVM networks AccountIds
                  const chainId = covalentNetworkToChainId(network!)!
                  return parseToNftItem(
                    Object.assign(nftUserItem, { ownerAddress: address }),
                    chainId,
                  )
                })

                data = data.concat(parsedData)
                if (res.data.items.length < limit) {
                  break
                }
              }
            } catch (e) {
              console.error(e)
              break
            }
          }

          return { data }
        },
      },
    ),
  }),
})
