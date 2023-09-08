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
          const response = await fetch(url).then(res => res.json())
          if (isEmpty(response.result) || response.message !== 'OK') throw new Error(response)
          // TODO: render response.result error message in the UI when response.message === "NOTOK"
          const abi = JSON.parse(response.result)
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
