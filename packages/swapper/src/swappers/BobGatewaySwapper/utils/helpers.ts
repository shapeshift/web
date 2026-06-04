import type { GatewayOrderStatusV2, GatewayQuoteV2, GetQuoteParams } from '@gobob/bob-sdk'
import { GatewaySDK } from '@gobob/bob-sdk'
import { bobChainId, fromAssetId } from '@shapeshiftoss/caip'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { bnOrZero, isToken } from '@shapeshiftoss/utils'
import { getAddress, zeroAddress } from 'viem'

import type { SwapErrorRight, SwapperConfig } from '../../../types'
import { TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { getTreasuryAddressFromChainId } from '../../utils/helpers/helpers'
import { BOB_GATEWAY_BASE_URL, chainIdToBobGatewayChainName } from './constants'

export const getBobGatewayClient = (config: SwapperConfig): GatewaySDK =>
  new GatewaySDK({ basePath: BOB_GATEWAY_BASE_URL, apiKey: config.VITE_BOB_GATEWAY_API_KEY })

export const assetIdToBobGatewayToken = (assetId: string): string => {
  // BOB Gateway uses the zero address as the token address for native assets
  if (!isToken(assetId)) return zeroAddress
  return fromAssetId(assetId).assetReference
}

// Affiliate fees are deducted from the swap output at settlement and paid to an EVM address on BOB chain
export const getBobGatewayAffiliates = (affiliateBps: string): GetQuoteParams['affiliates'] => {
  const bps = bnOrZero(affiliateBps)
  if (!bps.isFinite() || bps.lte(0)) return undefined

  const affiliateAddress = getTreasuryAddressFromChainId(bobChainId)

  return [{ address: getAddress(affiliateAddress), bps: bps.toNumber() }]
}

export const mapBobGatewayOrderStatusToTxStatus = (status: GatewayOrderStatusV2): TxStatus => {
  if ('inProgress' in status) return TxStatus.Pending
  if ('success' in status) return TxStatus.Confirmed
  if ('refunded' in status) return TxStatus.Failed
  return TxStatus.Unknown
}

export const getBobGatewayQuoteMetadata = (quote: GatewayQuoteV2) => {
  const { outputAmount, estimatedTimeInSecs } =
    'onramp' in quote ? quote.onramp : 'offramp' in quote ? quote.offramp : quote.tokenSwap

  return {
    outputAmount: outputAmount.amount,
    estimatedExecutionTimeMs:
      typeof estimatedTimeInSecs === 'number' ? estimatedTimeInSecs * 1000 : undefined,
  }
}

export const validateBobGatewayRoute = (
  sellChainId: string,
  buyChainId: string,
): SwapErrorRight | undefined => {
  const sellChainName = chainIdToBobGatewayChainName[sellChainId]
  const buyChainName = chainIdToBobGatewayChainName[buyChainId]

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
}
