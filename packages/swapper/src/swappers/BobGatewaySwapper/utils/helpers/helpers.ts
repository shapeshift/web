import type {
  GatewayOrderStatusV2,
  GatewayQuoteV2,
  GetQuoteParams
} from '@gobob/bob-sdk'
import {
  GatewaySDK,
  instanceOfGatewayOrderStatusV2OneOf,
  instanceOfGatewayOrderStatusV2OneOf1,
  instanceOfGatewayOrderStatusV2OneOf2,
  instanceOfGatewayQuoteV2OneOf,
  instanceOfGatewayQuoteV2OneOf1,
} from '@gobob/bob-sdk'
import { fromAssetId } from '@shapeshiftoss/caip'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { isToken } from '@shapeshiftoss/utils'
import { getAddress, isAddress } from 'viem'

import type { SwapErrorRight, SwapperConfig } from '../../../../types'
import { TradeQuoteError } from '../../../../types'
import { makeSwapErrorRight } from '../../../../utils'
import type { BobGatewayChainName } from '../constants'
import {
  BOB_GATEWAY_AFFILIATE_BPS,
  BOB_GATEWAY_BASE_URL,
  BTC_TOKEN_ADDRESS,
  CHAIN_ID_TO_BOB_GATEWAY_CHAIN_NAME,
} from '../constants'

export const chainIdToBobGatewayChainName = (chainId: string): BobGatewayChainName | undefined => {
  return CHAIN_ID_TO_BOB_GATEWAY_CHAIN_NAME[chainId]
}

/**
 * Converts a ShapeShift AssetId to the token address format expected by the BOB Gateway API.
 * Native BTC maps to the zero address (0x000...000).
 * ERC-20s on BOB chain map to their contract address.
 */
export const assetIdToBobGatewayToken = (assetId: string): string => {
  if (!isToken(assetId)) {
    // Native asset (BTC, or native BOB ETH-equivalent)
    return BTC_TOKEN_ADDRESS
  }
  const { assetReference } = fromAssetId(assetId)
  return assetReference
}

export const getBobGatewayClient = (config: SwapperConfig): GatewaySDK => {
  const apiKey = config.VITE_BOB_GATEWAY_API_KEY

  return new GatewaySDK({
    basePath: BOB_GATEWAY_BASE_URL,
    apiKey: apiKey || undefined,
  })
}

export const getBobGatewayAffiliates = (config: SwapperConfig): GetQuoteParams['affiliates'] => {
  const affiliateAddress = config.VITE_BOB_GATEWAY_AFFILIATE_ID.trim()
  if (!isAddress(affiliateAddress)) return undefined

  return [{ address: getAddress(affiliateAddress), bps: BOB_GATEWAY_AFFILIATE_BPS }]
}

export const mapBobGatewayOrderStatusToTxStatus = (status: GatewayOrderStatusV2): TxStatus => {
  if (instanceOfGatewayOrderStatusV2OneOf(status)) return TxStatus.Pending
  if (instanceOfGatewayOrderStatusV2OneOf1(status)) return TxStatus.Confirmed
  if (instanceOfGatewayOrderStatusV2OneOf2(status)) return TxStatus.Failed

  return TxStatus.Unknown
}

export const getBobGatewayQuoteMetadata = (quote: GatewayQuoteV2) => {
  const quoteDetails = instanceOfGatewayQuoteV2OneOf(quote) ? quote.onramp : instanceOfGatewayQuoteV2OneOf1(quote) ? quote.offramp : quote.tokenSwap
  const estimatedExecutionTimeMs =
    quoteDetails.estimatedTimeInSecs != null ? quoteDetails.estimatedTimeInSecs * 1000 : undefined

  return {
    outputAmount: quoteDetails.outputAmount.amount,
    estimatedExecutionTimeMs,
  }
}

export const validateBobGatewayRoute = (
  sellChainId: string,
  buyChainId: string,
): SwapErrorRight | null => {
  const sellChainName = chainIdToBobGatewayChainName(sellChainId)
  const buyChainName = chainIdToBobGatewayChainName(buyChainId)

  if (!sellChainName) {
    return makeSwapErrorRight({
      message: `[BobGateway] unsupported sell chain: ${sellChainId}`,
      code: TradeQuoteError.UnsupportedChain,
      details: { chainId: sellChainId },
    })
  }

  if (!buyChainName) {
    return makeSwapErrorRight({
      message: `[BobGateway] unsupported buy chain: ${buyChainId}`,
      code: TradeQuoteError.UnsupportedChain,
      details: { chainId: buyChainId },
    })
  }

  // Must be cross-chain: bitcoin↔bob (not same-chain swaps)
  if (sellChainName === buyChainName) {
    return makeSwapErrorRight({
      message: `[BobGateway] same-chain swaps not supported`,
      code: TradeQuoteError.CrossChainNotSupported,
    })
  }

  return null
}
