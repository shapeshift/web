import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { bn } from '@shapeshiftoss/utils'
import { Err, Ok } from '@sniptt/monads'
import { getAddress, zeroAddress } from 'viem'

import { TradeQuoteError } from '../../../types'
import { getInputOutputRate, makeSwapErrorRight } from '../../../utils'
import type { FyndSupportedChainId } from './constants'
import {
  FYND_NATIVE_ASSET_ADDRESS,
  FYND_ROUTER_FEE_DIVISOR,
  FYND_SUPPORTED_CHAIN_IDS,
} from './constants'

export const isFyndSupportedChainId = (chainId: ChainId): chainId is FyndSupportedChainId =>
  FYND_SUPPORTED_CHAIN_IDS.includes(chainId as FyndSupportedChainId)

export const assetIdToFyndToken = (assetId: AssetId) => {
  const { assetNamespace, assetReference } = fromAssetId(assetId)
  if (assetNamespace === 'slip44') return FYND_NATIVE_ASSET_ADDRESS
  return getAddress(assetReference)
}

export const assertValidTrade = ({
  sellAsset,
  buyAsset,
}: {
  sellAsset: Asset
  buyAsset: Asset
}) => {
  if (!isFyndSupportedChainId(sellAsset.chainId) || !isFyndSupportedChainId(buyAsset.chainId)) {
    return Err(
      makeSwapErrorRight({
        message: 'Fynd only supports configured EVM chains',
        code: TradeQuoteError.UnsupportedChain,
      }),
    )
  }

  if (sellAsset.chainId !== buyAsset.chainId) {
    return Err(
      makeSwapErrorRight({
        message: 'Fynd does not support cross-chain trades',
        code: TradeQuoteError.CrossChainNotSupported,
      }),
    )
  }

  return Ok(true)
}

export const calculateFyndRouterFee = (amountOut: string) =>
  bn(amountOut).div(FYND_ROUTER_FEE_DIVISOR).integerValue().toFixed()

export const calculateFyndAmounts = ({
  amountOut,
  routerFee,
  clientFee = '0',
}: {
  amountOut: string
  routerFee: string
  clientFee?: string
}) => ({
  buyAmountBeforeFeesCryptoBaseUnit: amountOut,
  buyAmountAfterFeesCryptoBaseUnit: bn(amountOut).minus(routerFee).minus(clientFee).toFixed(),
})

export const calculateFyndRate = ({
  sellAmount,
  buyAmount,
  sellAsset,
  buyAsset,
}: {
  sellAmount: string
  buyAmount: string
  sellAsset: Asset
  buyAsset: Asset
}) =>
  getInputOutputRate({
    sellAmountCryptoBaseUnit: sellAmount,
    buyAmountCryptoBaseUnit: buyAmount,
    sellAsset,
    buyAsset,
  })

export const isNativeFyndSell = (assetId: AssetId) => assetIdToFyndToken(assetId) === zeroAddress
