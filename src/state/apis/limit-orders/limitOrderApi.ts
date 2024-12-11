import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/dist/query/react'
import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import {
  assertGetCowNetwork,
  getAffiliateAppDataFragmentByChainId,
  signCowMessage,
  signCowOrder,
  signCowOrderCancellation,
} from '@shapeshiftoss/swapper'
import { COW_SWAP_NATIVE_ASSET_MARKER_ADDRESS } from '@shapeshiftoss/swapper/dist/swappers/CowSwapper/utils/constants'
import { getFullAppData } from '@shapeshiftoss/swapper/dist/swappers/CowSwapper/utils/helpers/helpers'
import { isNativeEvmAsset } from '@shapeshiftoss/swapper/dist/swappers/utils/helpers/helpers'
import type {
  CowSwapError,
  Order,
  OrderCancellation,
  OrderCreation,
  OrderId,
  OrderQuoteRequest,
  OrderQuoteResponse,
  OrderStatus,
  QuoteId,
  Trade,
} from '@shapeshiftoss/types'
import {
  EcdsaSigningScheme,
  OrderClass,
  OrderQuoteSideKindSell,
  PriceQuality,
  SellTokenSource,
  SigningScheme,
} from '@shapeshiftoss/types'
import type { AxiosError } from 'axios'
import axios from 'axios'
import { getConfig } from 'config'
import type { TypedData } from 'eip-712'
import type { Address } from 'viem'
import { zeroAddress } from 'viem'
import { assertGetEvmChainAdapter } from 'lib/utils/evm'
import type { ReduxState } from 'state/reducer'
import { selectConfirmedLimitOrder } from 'state/slices/limitOrderSlice/selectors'
import { selectPortfolioAccountMetadataByAccountId } from 'state/slices/selectors'

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
        const network = assertGetCowNetwork(chainId)

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
        const baseUrl = config.REACT_APP_COWSWAP_BASE_URL
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
            error: axiosError.response?.data as CowSwapError | undefined,
          }
        }
      },
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
        const baseUrl = config.REACT_APP_COWSWAP_BASE_URL
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
    }),
    getOrderStatus: build.query<OrderStatus, { orderId: OrderId; chainId: ChainId }>({
      queryFn: async ({ orderId, chainId }) => {
        const config = getConfig()
        const baseUrl = config.REACT_APP_COWSWAP_BASE_URL
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
        const baseUrl = config.REACT_APP_COWSWAP_BASE_URL
        const network = assertGetCowNetwork(chainId)
        const result = await axios.get<Trade[]>(
          `${baseUrl}/${network}/api/v1/trades?owner=${owner}`,
        )
        return { data: result.data }
      },
    }),
  }),
})

export const { useQuoteLimitOrderQuery, usePlaceLimitOrderMutation, useCancelLimitOrderMutation } =
  limitOrderApi
