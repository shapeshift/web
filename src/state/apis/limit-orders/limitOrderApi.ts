import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/dist/query/react'
import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromAccountId, fromAssetId, fromChainId } from '@shapeshiftoss/caip'
import type { SignTypedDataInput } from '@shapeshiftoss/chain-adapters'
import { toAddressNList } from '@shapeshiftoss/chain-adapters'
import type { ETHSignTypedData, HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { CowSwapError } from '@shapeshiftoss/swapper'
import { COW_SWAP_SETTLEMENT_ADDRESS, getCowswapNetwork } from '@shapeshiftoss/swapper'
import { COW_SWAP_NATIVE_ASSET_MARKER_ADDRESS } from '@shapeshiftoss/swapper/dist/swappers/CowSwapper/utils/constants'
import {
  domain,
  getAffiliateAppDataFragmentByChainId,
  getFullAppData,
  getSignTypeDataPayload,
} from '@shapeshiftoss/swapper/dist/swappers/CowSwapper/utils/helpers/helpers'
import { isNativeEvmAsset } from '@shapeshiftoss/swapper/dist/swappers/utils/helpers/helpers'
import type {
  Order,
  OrderCancellation,
  OrderCreation,
  OrderId,
  OrderQuoteRequest,
  OrderQuoteResponse,
  OrderStatus,
  QuoteId,
  Trade,
} from '@shapeshiftoss/types/dist/cowSwap'
import {
  OrderQuoteSideKindSell,
  PriceQuality,
  SellTokenSource,
  SigningScheme,
} from '@shapeshiftoss/types/dist/cowSwap'
import type { AxiosError } from 'axios'
import axios from 'axios'
import { getConfig } from 'config'
import type { TypedData } from 'eip-712'
import { ethers } from 'ethers'
import type { Address } from 'viem'
import { zeroAddress } from 'viem'
import { assertGetEvmChainAdapter } from 'lib/utils/evm'
import type { ReduxState } from 'state/reducer'
import { selectConfirmedLimitOrder } from 'state/slices/limitOrderSlice/selectors'
import {
  selectPortfolioAccountMetadataByAccountId,
} from 'state/slices/selectors'

import { BASE_RTK_CREATE_API_CONFIG } from '../const'

export type LimitOrderQuoteParams = {
  sellAssetId: AssetId
  buyAssetId: AssetId
  chainId: ChainId
  slippageTolerancePercentageDecimal: string
  affiliateBps: string
  sellAccountAddress: Address | undefined
  sellAmountCryptoBaseUnit: string
  recipientAddress: Address | undefined
}

export const limitOrderApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'limitOrderApi',
  keepUnusedDataFor: Number.MAX_SAFE_INTEGER, // never clear, we will manage this
  tagTypes: ['LimitOrder'],
  baseQuery: fakeBaseQuery<CowSwapError | undefined>(),
  endpoints: build => ({
    quoteLimitOrder: build.query<OrderQuoteResponse, LimitOrderQuoteParams>({
      queryFn: async (params: LimitOrderQuoteParams) => {
        const {
          sellAssetId,
          buyAssetId,
          chainId,
          slippageTolerancePercentageDecimal,
          affiliateBps,
          sellAccountAddress,
          sellAmountCryptoBaseUnit,
          recipientAddress,
        } = params
        const config = getConfig()
        const baseUrl = config.REACT_APP_COWSWAP_BASE_URL
        const maybeNetwork = getCowswapNetwork(chainId)
        if (maybeNetwork.isErr()) throw maybeNetwork.unwrapErr()
        const network = maybeNetwork.unwrap()

        const affiliateAppDataFragment = getAffiliateAppDataFragmentByChainId({
          affiliateBps,
          chainId,
        })

        const { appData, appDataHash } = await getFullAppData(
          slippageTolerancePercentageDecimal,
          affiliateAppDataFragment,
          'limit',
        )

        const limitOrderQuoteRequest: OrderQuoteRequest = {
          sellToken: fromAssetId(sellAssetId).assetReference as Address,
          buyToken: !isNativeEvmAsset(buyAssetId)
            ? (fromAssetId(buyAssetId).assetReference as Address)
            : COW_SWAP_NATIVE_ASSET_MARKER_ADDRESS,
          receiver: recipientAddress,
          sellTokenBalance: SellTokenSource.ERC20,
          from: sellAccountAddress ?? zeroAddress, // Zero address used to enable quotes without wallet connected
          priceQuality: PriceQuality.OPTIMAL,
          signingScheme: SigningScheme.EIP712,
          onchainOrder: undefined,
          kind: OrderQuoteSideKindSell.SELL,
          sellAmountBeforeFee: sellAmountCryptoBaseUnit,
          appData,
          appDataHash,
        }

        limitOrderQuoteRequest.appData = appData
        limitOrderQuoteRequest.appDataHash = appDataHash

        try {
          const axiosResponse = await axios.post<OrderQuoteResponse>(
            `${baseUrl}/${network}/api/v1/quote/`,
            limitOrderQuoteRequest,
          )
          const response = axiosResponse.data

          // Both the params and the response are returned to provide complete information downstream without race conditions
          return { data: response }
        } catch (e) {
          const axiosError = e as AxiosError
          return {
            error: axiosError.response?.data as CowSwapError | undefined,
          }
        }
      },
    }),
    placeLimitOrder: build.mutation<OrderId, { quoteId: QuoteId; wallet: HDWallet | null }>({
      queryFn: async ({ quoteId: _quoteId, wallet }, { getState }) => {
        const state = getState() as ReduxState
        const {
          unsignedOrderCreation,
          params: { sellAssetId, accountId },
        } = selectConfirmedLimitOrder(state, _quoteId)
        const { chainId } = fromAssetId(sellAssetId)
        const accountMetadata = selectPortfolioAccountMetadataByAccountId(state, { accountId })

        // Removes the types that aren't part of GpV2Order types or structured signing will fail
        const { signingScheme, quoteId, appDataHash, appData, receiver, ...rest } =
          unsignedOrderCreation

        if (!wallet) throw Error('missing wallet')
        if (!appDataHash) throw Error('missing appDataHash')
        if (!receiver) throw Error('missing receiver')
        if (!accountMetadata) throw Error('missing accountMetadata')

        const message = { receiver, ...rest }

        const signMessage = async (message: TypedData) => {
          const { bip44Params } = accountMetadata
          const adapter = assertGetEvmChainAdapter(chainId)
          const typedDataToSign: ETHSignTypedData = {
            addressNList: toAddressNList(bip44Params),
            typedData: message,
          }

          const signTypedDataInput: SignTypedDataInput<ETHSignTypedData> = {
            typedDataToSign,
            wallet,
          }

          const output = await adapter.signTypedData(signTypedDataInput)

          return output
        }

        const { chainReference } = fromChainId(chainId)
        const signingDomain = Number(chainReference)
        const typedData = getSignTypeDataPayload(
          domain(signingDomain, COW_SWAP_SETTLEMENT_ADDRESS),
          {
            ...message,
            // The order we're signing requires the appData to be a hash, not the stringified doc
            // However, the request we're making to *send* the order to the API requires both appData and appDataHash in their original form
            // see https://github.com/cowprotocol/cowswap/blob/a11703f4e93df0247c09d96afa93e13669a3c244/apps/cowswap-frontend/src/legacy/utils/trade.ts#L236
            appData: appDataHash,
          },
        )

        const signedTypeData = await signMessage(typedData)

        // Passing the signature through split/join to normalize the `v` byte.
        // Some wallets do not pad it with `27`, which causes a signature failure
        // `splitSignature` pads it if needed, and `joinSignature` simply puts it back together
        const signature = ethers.Signature.from(ethers.Signature.from(signedTypeData)).serialized

        const limitOrder: OrderCreation = { ...unsignedOrderCreation, signature }

        const config = getConfig()
        const baseUrl = config.REACT_APP_COWSWAP_BASE_URL
        const maybeNetwork = getCowswapNetwork(chainId)
        if (maybeNetwork.isErr()) throw maybeNetwork.unwrapErr()
        const network = maybeNetwork.unwrap()

        try {
          const result = await axios.post<OrderId>(
            `${baseUrl}/${network}/api/v1/orders/`,
            limitOrder,
          )
          const orderId = result.data
          return { data: orderId }
        } catch (e) {
          const axiosError = e as AxiosError
          return {
            error: axiosError.response?.data as CowSwapError | undefined,
          }
        }
      },
    }),
    cancelLimitOrders: build.mutation<boolean, { payload: OrderCancellation; chainId: ChainId }>({
      queryFn: async ({ payload, chainId }) => {
        const config = getConfig()
        const baseUrl = config.REACT_APP_COWSWAP_BASE_URL
        const maybeNetwork = getCowswapNetwork(chainId)
        if (maybeNetwork.isErr()) throw maybeNetwork.unwrapErr()
        const network = maybeNetwork.unwrap()
        const result = await axios.delete<void>(`${baseUrl}/${network}/api/v1/orders`, {
          data: payload,
        })
        // If the result is a 200 then the order was successfully canceled
        return { data: result.status === 200 }
      },
    }),
    getOrderStatus: build.query<OrderStatus, { orderId: OrderId; chainId: ChainId }>({
      queryFn: async ({ orderId, chainId }) => {
        const config = getConfig()
        const baseUrl = config.REACT_APP_COWSWAP_BASE_URL
        const maybeNetwork = getCowswapNetwork(chainId)
        if (maybeNetwork.isErr()) throw maybeNetwork.unwrapErr()
        const network = maybeNetwork.unwrap()
        const result = await axios.get<OrderStatus>(
          `${baseUrl}/${network}/api/v1/orders/${orderId}/status`,
        )
        return { data: result.data }
      },
    }),
    getTrades: build.query<Trade[], { chainId: ChainId } & { owner: string }>({
      queryFn: async ({ owner, chainId }) => {
        const config = getConfig()
        const baseUrl = config.REACT_APP_COWSWAP_BASE_URL
        const maybeNetwork = getCowswapNetwork(chainId)
        if (maybeNetwork.isErr()) throw maybeNetwork.unwrapErr()
        const network = maybeNetwork.unwrap()
        const result = await axios.get<Trade[]>(
          `${baseUrl}/${network}/api/v1/trades?owner=${owner}`,
        )
        return { data: result.data }
      },
    }),
    getOrders: build.query<{ orders: Order[]; failedAccountIds: AccountId[] }, AccountId[]>({
      queryFn: async (evmAccountIds: AccountId[]) => {
        const config = getConfig()
        const baseUrl = config.REACT_APP_COWSWAP_BASE_URL

        const promiseSettledResults = await Promise.allSettled(
          evmAccountIds.map(async accountId => {
            const { account, chainId } = fromAccountId(accountId)
            const maybeNetwork = getCowswapNetwork(chainId)
            if (maybeNetwork.isErr()) throw maybeNetwork.unwrapErr()
            const network = maybeNetwork.unwrap()
            const result = await axios.get<Order[]>(
              // TODO: Implement paging for users with >1000 orders
              `${baseUrl}/${network}/api/v1/account/${account}/orders?limit=1000`,
            )

            return result.data
          }),
        )

        const orders = []
        const failedAccountIds = []

        for (let i = 0; i < promiseSettledResults.length; i++) {
          const promiseSettledResult = promiseSettledResults[i]
          if (promiseSettledResult.status === 'rejected') {
            failedAccountIds.push(evmAccountIds[i])
          } else {
            orders.push(...promiseSettledResult.value)
          }
        }

        return { data: { orders, failedAccountIds } }
      },
    }),
  }),
})

export const { useQuoteLimitOrderQuery, useGetOrdersQuery, usePlaceLimitOrderMutation } =
  limitOrderApi
