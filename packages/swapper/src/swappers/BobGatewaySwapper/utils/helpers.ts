import type { GatewayOrderStatusV2, GatewayQuoteV2, GetQuoteParams } from '@gobob/bob-sdk'
import { GatewaySDK } from '@gobob/bob-sdk'
import type { AssetId } from '@shapeshiftoss/caip'
import { ASSET_NAMESPACE, bobChainId, fromAssetId, toAssetId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import type { Asset, AssetsByIdPartial } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import {
  bnOrZero,
  chainIdToFeeAssetId,
  contractAddressOrUndefined,
  isToken,
} from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { getAddress, zeroAddress } from 'viem'

import type { QuoteFeeData, SwapErrorRight, SwapperConfig } from '../../../types'
import { TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { getTreasuryAddressFromChainId } from '../../utils/helpers/helpers'
import type { BobGatewayChainName } from './constants'
import {
  BOB_GATEWAY_BASE_URL,
  bobGatewayChainNameToChainId,
  chainIdToBobGatewayChainName,
} from './constants'

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

const bobGatewayFeeToAssetId = (fee: { address: string; chain: string }): AssetId | undefined => {
  const chainId = bobGatewayChainNameToChainId[fee.chain as BobGatewayChainName]
  if (!chainId) return

  if (fee.address.toLowerCase() === zeroAddress) return chainIdToFeeAssetId(chainId)

  return toAssetId({
    chainId,
    assetNamespace: ASSET_NAMESPACE.erc20,
    assetReference: fee.address,
  })
}

// Normalize the three quote variants into the common fields we consume
const getBobGatewayQuoteDetails = (quote: GatewayQuoteV2) => {
  if ('onramp' in quote) {
    const { outputAmount, estimatedTimeInSecs, fees } = quote.onramp
    return { outputAmount, estimatedTimeInSecs, fees: [fees] }
  }

  if ('offramp' in quote) {
    const { outputAmount, estimatedTimeInSecs, feeBreakdown } = quote.offramp
    const { affiliateFee, inclusionFee, protocolFee, solverFee } = feeBreakdown

    return {
      outputAmount,
      estimatedTimeInSecs,
      fees: [affiliateFee, inclusionFee, protocolFee, solverFee],
    }
  }

  const { outputAmount, estimatedTimeInSecs, fees } = quote.tokenSwap
  return { outputAmount, estimatedTimeInSecs, fees: [fees] }
}

export const parseBobGatewayQuote = (
  quote: GatewayQuoteV2,
  buyAsset: Asset,
  assetsById: AssetsByIdPartial,
) => {
  const { outputAmount, estimatedTimeInSecs, fees } = getBobGatewayQuoteDetails(quote)

  const protocolFees = fees.reduce<NonNullable<QuoteFeeData['protocolFees']>>((acc, fee) => {
    const amountCryptoBaseUnit = bnOrZero(fee.amount)
    if (amountCryptoBaseUnit.lte(0)) return acc

    const assetId = bobGatewayFeeToAssetId(fee)
    if (!assetId) return acc

    const asset = assetId === buyAsset.assetId ? buyAsset : assetsById[assetId]
    if (!asset) return acc

    acc[assetId] = {
      amountCryptoBaseUnit: bnOrZero(acc[assetId]?.amountCryptoBaseUnit)
        .plus(amountCryptoBaseUnit)
        .toFixed(),
      asset,
      requiresBalance: false,
    }
    return acc
  }, {})

  // buyAmountBeforeFees is denominated in the buy asset, so only add back buy-asset-denominated fees
  const buyAssetFeeCryptoBaseUnit = bnOrZero(protocolFees[buyAsset.assetId]?.amountCryptoBaseUnit)

  return {
    buyAmountBeforeFeesCryptoBaseUnit: buyAssetFeeCryptoBaseUnit
      .plus(bnOrZero(outputAmount.amount))
      .toFixed(),
    buyAmountAfterFeesCryptoBaseUnit: outputAmount.amount,
    protocolFees,
    estimatedExecutionTimeMs:
      typeof estimatedTimeInSecs === 'number' ? estimatedTimeInSecs * 1000 : undefined,
  }
}

export const getBobGatewayAllowanceContract = (quote: GatewayQuoteV2, sellAsset: Asset): string => {
  if (!isEvmChainId(sellAsset.chainId)) return ''
  if (!contractAddressOrUndefined(sellAsset.assetId)) return ''
  if ('offramp' in quote) return quote.offramp.txTo
  if ('tokenSwap' in quote) return quote.tokenSwap.txTo
  return ''
}

export const assertValidTrade = ({
  sellAsset,
  buyAsset,
}: {
  sellAsset: Asset
  buyAsset: Asset
}): Result<
  { sellChainName: BobGatewayChainName; buyChainName: BobGatewayChainName },
  SwapErrorRight
> => {
  const sellChainName = chainIdToBobGatewayChainName[sellAsset.chainId]
  const buyChainName = chainIdToBobGatewayChainName[buyAsset.chainId]

  if (!sellChainName) {
    return Err(
      makeSwapErrorRight({
        message: `[BobGateway] unsupported sell chain: ${sellAsset.chainId}`,
        code: TradeQuoteError.UnsupportedChain,
        details: { chainId: sellAsset.chainId },
      }),
    )
  }

  if (!buyChainName) {
    return Err(
      makeSwapErrorRight({
        message: `[BobGateway] unsupported buy chain: ${buyAsset.chainId}`,
        code: TradeQuoteError.UnsupportedChain,
        details: { chainId: buyAsset.chainId },
      }),
    )
  }

  return Ok({ sellChainName, buyChainName })
}
