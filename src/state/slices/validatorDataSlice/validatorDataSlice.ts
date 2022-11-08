import type { ChainId } from '@keepkey/caip'
import type { cosmossdk, CosmosSdkBaseAdapter, CosmosSdkChainId } from '@keepkey/chain-adapters'
import { createSlice } from '@reduxjs/toolkit'
import { createApi } from '@reduxjs/toolkit/query/react'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { logger } from 'lib/logger'
import { BASE_RTK_CREATE_API_CONFIG } from 'state/apis/const'

import type { PortfolioAccounts } from '../portfolioSlice/portfolioSliceCommon'
import { getDefaultValidatorAddressFromChainId } from './utils'

const moduleLogger = logger.child({ namespace: ['validatorDataSlice'] })

export type PubKey = string

type SingleValidatorDataArgs = { accountSpecifier: string; chainId: ChainId }

export type ValidatorData = {
  byValidator: ValidatorDataByPubKey
  validatorIds: PubKey[]
}

export type ValidatorDataByPubKey = {
  [k: PubKey]: cosmossdk.Validator
}

const initialState: ValidatorData = {
  byValidator: {},
  validatorIds: [],
}

const updateOrInsertValidatorData = (
  validatorDataState: ValidatorData,
  validators: cosmossdk.Validator[],
) => {
  validators.forEach(validator => {
    validatorDataState.validatorIds.push(validator.address)
    validatorDataState.byValidator[validator.address] = validator
  })
}

export const validatorData = createSlice({
  name: 'validatorData',
  initialState,
  reducers: {
    clear: () => initialState,
    upsertValidatorData: (
      validatorDataState,
      { payload }: { payload: { validators: cosmossdk.Validator[] } },
    ) => {
      if (!payload.validators) return
      updateOrInsertValidatorData(validatorDataState, payload.validators)
    },
  },
})

export const validatorDataApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'validatorDataApi',
  // 5 minutes caching against overfetching. The only thing that can change on new Tx is effectively TVL and APR
  // The first won't noticeably change given the Million fiat precision we use, and the former effectively won't noticeably change either in such timeframe
  keepUnusedDataFor: 300,
  endpoints: build => ({
    getValidatorData: build.query<cosmossdk.Validator, SingleValidatorDataArgs>({
      queryFn: async ({ accountSpecifier, chainId }, { dispatch, getState }) => {
        // limitation of redux tookit https://redux-toolkit.js.org/rtk-query/api/createApi#queryfn
        const { byId } = (getState() as any).portfolio.accounts as PortfolioAccounts

        const portfolioAccount = byId[accountSpecifier]

        const validatorAddress = getDefaultValidatorAddressFromChainId(chainId)

        const validatorIds = portfolioAccount?.validatorIds?.length
          ? portfolioAccount.validatorIds
          : [validatorAddress]

        const chainAdapters = getChainAdapterManager()
        const adapter = chainAdapters.get(chainId) as
          | CosmosSdkBaseAdapter<CosmosSdkChainId>
          | undefined
        if (!adapter) {
          return {
            error: { data: `No adapter available for chainId ${chainId}`, status: 404 },
          }
        }

        const validators = await Promise.allSettled(
          validatorIds.map(async validatorId => {
            try {
              const data = await adapter.getValidator(validatorId)

              if (!data) return

              dispatch(
                validatorData.actions.upsertValidatorData({
                  validators: [data],
                }),
              )
            } catch (err) {
              if (err instanceof Error) {
                throw new Error(`failed to get data for validator: ${validatorId}: ${err.message}`)
              }
            }
          }),
        )

        validators.forEach(promise => {
          if (promise.status === 'rejected') {
            moduleLogger.child({ fn: 'getValidatorData' }).warn(promise.reason)
          }
        })

        return { data: {} as cosmossdk.Validator }
      },
    }),
  }),
})
