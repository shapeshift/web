import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react'
import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import {
  assertGetCowNetwork,
  COW_SWAP_NATIVE_ASSET_MARKER_ADDRESS,
  getAffiliateAppDataFragmentByChainId,
  getCowNetwork,
  getFullAppData,
  isNativeEvmAsset,
  signCowMessage,
  signCowOrder,
  signCowOrderCancellation,
} from '@shapeshiftoss/swapper'
import type {
  CowSwapError,
  CowSwapQuoteId,
  Order,
  OrderCancellation,
  OrderCreation,
  OrderId,
  OrderQuoteRequest,
  OrderQuoteResponse,
  OrderStatus,
  ParsedAppData,
  Trade,
} from '@shapeshiftoss/types'
import {
  EcdsaSigningScheme,
  isLegacyAppData,
  OrderClass,
  OrderQuoteSideKindSell,
  PriceQuality,
  SellTokenSource,
  SigningScheme,
} from '@shapeshiftoss/types'
import { isSome } from '@shapeshiftoss/utils'
import type { AxiosError } from 'axios'
import axios from 'axios'
import type { TypedData } from 'eip-712'
import orderBy from 'lodash/orderBy'
import type { Address } from 'viem'
import { zeroAddress } from 'viem'

import { BASE_RTK_CREATE_API_CONFIG } from '../const'

import { getConfig } from '@/config'
import { assertGetEvmChainAdapter } from '@/lib/utils/evm'
import type { ReduxState } from '@/state/reducer'
import { selectConfirmedLimitOrder } from '@/state/slices/limitOrderSlice/selectors'
import { selectPortfolioAccountMetadataByAccountId } from '@/state/slices/selectors'

export type LimitOrderQuoteParams = {
  sellAssetId: AssetId
  buyAssetId: AssetId
  chainId: ChainId
  affiliateBps: string
  sellAccountAddress: Address | undefined
  sellAmountCryptoBaseUnit: string
  receiveAddress: Address | undefined
}

export const limitOrderApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'limitOrderApi',
  keepUnusedDataFor: Number.MAX_SAFE_INTEGER, // never clear, we will manage this
  tagTypes: ['limitOrders', 'limitOrderQuote'] as const,
  baseQuery: fakeBaseQuery<CowSwapError | null>(),
  endpoints: build => ({
    getLimitOrders: build.query<{ order: Order; accountId: AccountId }[], AccountId[]>({
      queryFn: async (accountIds: AccountId[]) => {
        const supportedAccountIds = accountIds.filter(accountId => {
          const { chainId } = fromAccountId(accountId)
          return Boolean(getCowNetwork(chainId))
        })

        try {
          const results = await Promise.all(
            supportedAccountIds.map(async accountId => {
              const { account, chainId } = fromAccountId(accountId)
              const network = assertGetCowNetwork(chainId)
              const config = getConfig()
              const baseUrl = config.VITE_COWSWAP_BASE_URL

              try {
                const result = await axios.get<Order[]>(
                  `${baseUrl}/${network}/api/v1/account/${account}/orders?limit=1000`,
                )

                // CowSwap limit and spot orders API is the same, so we need to filter out spot orders
                // there are no parameters to filter from their API, they are filtering after fetching
                // on their interface as it's some custom metadata they add
                const limitOrders = result.data.filter(order => {
                  // This shouldn't happen but...
                  if (!order.fullAppData) return true

                  const appData = JSON.parse(order.fullAppData) as ParsedAppData

                  // Legacy appdata was used for market orders only
                  if (isLegacyAppData(appData)) return false

                  return appData.metadata.orderClass?.orderClass !== OrderClass.MARKET
                })

                return limitOrders.map(order => {
                  return { order, accountId }
                })
              } catch (e) {
                console.error(`Error fetching orders for account ${accountId}:`, e)
                return []
              }
            }),
          )

          const flattened = orderBy(
            results.flat().filter(isSome),
            ({ order }) => order.creationDate,
            'desc',
          )

          return { data: flattened }
        } catch (e) {
          const axiosError = e as AxiosError
          return {
            error: (axiosError.response?.data ?? null) as CowSwapError | null,
          }
        }
      },
      providesTags: ['limitOrders'],
    }),
    quoteLimitOrder: build.query<OrderQuoteResponse, LimitOrderQuoteParams>({
      queryFn: async (params: LimitOrderQuoteParams) => {
        const {
          sellAssetId,
          buyAssetId,
          chainId,
          affiliateBps,
          sellAccountAddress,
          sellAmountCryptoBaseUnit,
          receiveAddress,
        } = params
        const config = getConfig()
        const baseUrl = config.VITE_COWSWAP_BASE_URL
        const network = assertGetCowNetwork(chainId)

        // Limit orders request 0 slippage.
        const slippageTolerancePercentageDecimal = '0'

        const affiliateAppDataFragment = getAffiliateAppDataFragmentByChainId({
          affiliateBps,
          chainId,
        })

        const { appData, appDataHash } = await getFullAppData(
          slippageTolerancePercentageDecimal,
          affiliateAppDataFragment,
          OrderClass.LIMIT,
        )

        const limitOrderQuoteRequest: OrderQuoteRequest = {
          sellToken: fromAssetId(sellAssetId).assetReference as Address,
          buyToken: !isNativeEvmAsset(buyAssetId)
            ? (fromAssetId(buyAssetId).assetReference as Address)
            : COW_SWAP_NATIVE_ASSET_MARKER_ADDRESS,
          receiver: receiveAddress,
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
            error: (axiosError.response?.data ?? null) as CowSwapError | null,
          }
        }
      },
      providesTags: (result, _error, _params) => {
        return [{ type: 'limitOrderQuote' as const, id: result?.id }]
      },
    }),
    placeLimitOrder: build.mutation<OrderId, { quoteId: CowSwapQuoteId; wallet: HDWallet | null }>({
      queryFn: async ({ quoteId, wallet }, { getState }) => {
        const state = getState() as ReduxState
        const {
          unsignedOrderCreation,
          params: { sellAssetId, accountId },
        } = selectConfirmedLimitOrder(state, { cowSwapQuoteId: quoteId })
        const { chainId } = fromAssetId(sellAssetId)
        const accountMetadata = selectPortfolioAccountMetadataByAccountId(state, { accountId })

        if (!wallet) throw Error('missing wallet')
        if (!accountMetadata) throw Error('missing accountMetadata')

        const signMessage = async (typedData: TypedData) => {
          return await signCowMessage(
            typedData,
            assertGetEvmChainAdapter(chainId),
            accountMetadata,
            wallet,
          )
        }

        const signature = await signCowOrder(unsignedOrderCreation, chainId, signMessage)

        const limitOrder: OrderCreation = { ...unsignedOrderCreation, signature }

        const config = getConfig()
        const baseUrl = config.VITE_COWSWAP_BASE_URL
        const network = assertGetCowNetwork(chainId)

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
            error: (axiosError.response?.data ?? null) as CowSwapError | null,
          }
        }
      },
      invalidatesTags: ['limitOrders'],
    }),
    cancelLimitOrder: build.mutation<
      number,
      {
        accountId: AccountId
        sellAssetId: AssetId
        buyAssetId: AssetId
        order: Order
        wallet: HDWallet | null
      }
    >({
      queryFn: async ({ accountId, order, wallet }, { getState }) => {
        const state = getState() as ReduxState
        const config = getConfig()
        const baseUrl = config.VITE_COWSWAP_BASE_URL
        const { chainId } = fromAccountId(accountId)
        const accountMetadata = selectPortfolioAccountMetadataByAccountId(state, { accountId })

        if (!wallet) throw Error('missing wallet')
        if (!accountMetadata) throw Error('missing accountMetadata')

        const signMessage = async (typedData: TypedData) => {
          return await signCowMessage(
            typedData,
            assertGetEvmChainAdapter(chainId),
            accountMetadata,
            wallet,
          )
        }

        const signature = await signCowOrderCancellation(order.uid, chainId, signMessage)

        const network = assertGetCowNetwork(chainId)
        const orderCancellationPayload: OrderCancellation = {
          orderUids: [order.uid],
          signature,
          signingScheme: EcdsaSigningScheme.EIP712,
        }

        const result = await axios.delete<void>(`${baseUrl}/${network}/api/v1/orders`, {
          data: orderCancellationPayload,
        })

        return { data: result.status }
      },
      invalidatesTags: ['limitOrders'],
    }),
    getOrderStatus: build.query<OrderStatus, { orderId: OrderId; chainId: ChainId }>({
      queryFn: async ({ orderId, chainId }) => {
        const config = getConfig()
        const baseUrl = config.VITE_COWSWAP_BASE_URL
        const network = assertGetCowNetwork(chainId)
        const result = await axios.get<OrderStatus>(
          `${baseUrl}/${network}/api/v1/orders/${orderId}/status`,
        )
        return { data: result.data }
      },
    }),
    getTrades: build.query<Trade[], { chainId: ChainId } & { owner: string }>({
      queryFn: async ({ owner, chainId }) => {
        const config = getConfig()
        const baseUrl = config.VITE_COWSWAP_BASE_URL
        const network = assertGetCowNetwork(chainId)
        const result = await axios.get<Trade[]>(
          `${baseUrl}/${network}/api/v1/trades?owner=${owner}`,
        )
        return { data: result.data }
      },
    }),
  }),
})

export const {
  useGetLimitOrdersQuery,
  useQuoteLimitOrderQuery,
  usePlaceLimitOrderMutation,
  useCancelLimitOrderMutation,
} = limitOrderApi
