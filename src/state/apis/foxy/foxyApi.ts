import { createApi } from '@reduxjs/toolkit/dist/query/react'
import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import { CHAIN_REFERENCE } from '@shapeshiftoss/caip'
import type { DefiType, WithdrawInfo } from '@shapeshiftoss/investor-foxy'
import type { AxiosError } from 'axios'
import axios from 'axios'
import { getConfig } from 'config'

import { BASE_RTK_CREATE_API_CONFIG } from '../const'

const TOKEMAK_STATS_URL = getConfig().REACT_APP_TOKEMAK_STATS_URL
const TOKEMAK_TFOX_POOL_ADDRESS = '0x808d3e6b23516967ceae4f17a5f9038383ed5311'

type GetFoxyAprOutput = {
  foxyApr: string
}

export type FoxyOpportunity = {
  type: DefiType
  provider: string
  version: string
  contractAddress: string
  rewardToken: string
  stakingToken: string
  chainId: ChainId
  tvl?: string
  expired?: boolean
  apy?: string
  balance: string
  contractAssetId: AssetId
  tokenAssetId: AssetId
  rewardTokenAssetId: AssetId
  pricePerShare: string
  withdrawInfo: Record<AccountId, WithdrawInfo>
}

export type MergedFoxyOpportunity = FoxyOpportunity & {
  /** @deprecated use cryptoAmountBaseUnit instead and derive precision amount from it*/
  cryptoAmountPrecision: string
  cryptoAmountBaseUnit: string
  fiatAmount: string
}

type TokemakPool = {
  address: string
  liquidityProviderApr: string
}

type TokemakChainData = {
  chainId: string
  pools: TokemakPool[]
}

export const foxyApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'foxyApi',
  endpoints: build => ({
    getFoxyApr: build.query<GetFoxyAprOutput, void>({
      queryFn: async () => {
        try {
          const response = await axios.get<{ chains: TokemakChainData[] }>(TOKEMAK_STATS_URL)
          const tokemakData = response?.data
          // Tokemak only supports mainnet for now, so we could just access chains[0], but this keeps things more declarative
          const tokemakChainData = tokemakData.chains.find(
            ({ chainId }) => chainId === CHAIN_REFERENCE.EthereumMainnet,
          )

          if (!tokemakChainData?.pools) {
            return {
              error: {
                error: 'Cannot get Tokemak pools data',
                status: 'CUSTOM_ERROR',
              },
            }
          }

          const { pools } = tokemakChainData
          const tFoxPool = pools.find(({ address }) => address === TOKEMAK_TFOX_POOL_ADDRESS)

          if (!tFoxPool) {
            return {
              error: {
                error: 'Cannot get Tokemak TFOX pool data',
                status: 'CUSTOM_ERROR',
              },
            }
          }

          return { data: { foxyApr: tFoxPool.liquidityProviderApr } }
        } catch (e) {
          if ((e as AxiosError).isAxiosError) {
            return {
              error: {
                error:
                  (e as AxiosError).response?.statusText ?? 'Cannot get Tokemak TFOX pool data',
                status: (e as AxiosError).response?.status ?? 400,
              },
            }
          }

          return {
            error: {
              error: 'Cannot get Tokemak TFOX pool data',
              status: 'PARSING_ERROR',
            },
          }
        }
      },
    }),
  }),
})

export const { useGetFoxyAprQuery } = foxyApi
