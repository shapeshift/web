import { createApi } from '@reduxjs/toolkit/dist/query/react'
import { getConfig } from 'config'
import isEmpty from 'lodash/isEmpty'
import { logger } from 'lib/logger'

import { BASE_RTK_CREATE_API_CONFIG } from '../const'

const moduleLogger = logger.child({ namespace: ['abiApi'] })

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
          const res = await fetch(url).then(res => res.json())
          if (res.status !== '1' || isEmpty(res.result)) throw new Error(res.result)
          const abi = JSON.parse(res.result)
          return { data: abi }
        } catch (e) {
          const data = `unable to fetch abi for ${contractAddress}`
          moduleLogger.error(e, { contractAddress }, data)
          const status = 400
          const error = { data, status }
          return error
        }
      },
    }),
  }),
})

export const { useGetContractAbiQuery } = abiApi
