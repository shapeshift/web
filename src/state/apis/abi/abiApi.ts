import { createApi } from '@reduxjs/toolkit/dist/query/react'
import { getConfig } from 'config'
import isEmpty from 'lodash/isEmpty'

import { BASE_RTK_CREATE_API_CONFIG } from '../const'

type ContractAddress = string // 0xaddress on evm mainnet
type Abi = any // json

export const abiApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'abiApi',
  endpoints: build => ({
    getContractAbi: build.query<Abi, ContractAddress>({
      keepUnusedDataFor: Number.MAX_SAFE_INTEGER, // never refetch these
      queryFn: async contractAddress => {
        try {
          const apiKey = getConfig().REACT_APP_ETHERSCAN_API_KEY
          const url = `https://api.etherscan.io/api?module=contract&action=getabi&address=${contractAddress}&apikey=${apiKey}`
          const response = await fetch(url)
          if (!response.ok) {
            const text = await response.text()
            console.error({ text, status: response.status })
            throw Error('Error fetching from etherscan')
          }

          const { result, message } = await response.json()

          if (message === 'NOTOK' || isEmpty(result)) {
            console.error({ result, message })
            throw Error('Error fetching from etherscan')
          }

          const abi = JSON.parse(result)
          return { data: abi }
        } catch (e) {
          console.error(e)
          const error = `unable to fetch abi for ${contractAddress}`
          return { error }
        }
      },
    }),
  }),
})

export const { useGetContractAbiQuery } = abiApi
