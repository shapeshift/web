import { createApi } from '@reduxjs/toolkit/dist/query/react'
import { getConfig } from 'config'
import { ethers } from 'ethers'
import { logger } from 'lib/logger'

import { BASE_RTK_CREATE_API_CONFIG } from '../const'

const moduleLogger = logger.child({ namespace: ['abiApi'] })

type ContractAddress = string
export const fiatRampApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'fiatRampApi',
  endpoints: build => ({
    getContract: build.query<ethers.utils.Interface, ContractAddress>({
      keepUnusedDataFor: Number.MAX_SAFE_INTEGER, // never refetch these
      queryFn: async contractAddress => {
        try {
          const apiKey = getConfig().REACT_APP_ETHERSCAN_API_KEY
          const url = `https://api.etherscan.io/api?module=contract&action=getabi&address=${contractAddress}&apikey=${apiKey}`
          const res = await fetch(url).then(res => res.json())
          if (res.status !== '1') throw new Error(res.result)

          const abi = JSON.parse(res.result)
          const data = new ethers.utils.Interface(abi)
          return { data }
        } catch (e) {
          const data = `unable to fetch contract ${contractAddress}`
          moduleLogger.error(e, { contractAddress }, data)
          const status = 400
          const error = { data, status }
          return error
        }
      },
    }),
  }),
})
