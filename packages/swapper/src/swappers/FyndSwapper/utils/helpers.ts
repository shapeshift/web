import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { BigNumber, bn } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import axios from 'axios'
import type { Address } from 'viem'
import { getAddress, isAddress, zeroAddress } from 'viem'

import type { SwapErrorRight } from '../../../types'
import { TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { isNativeEvmAsset } from '../../../utils/helpers'
import type { FyndErrorResponse } from '../types'
import type { FyndSupportedChainId } from './constants'
import { FYND_CHAINS, FYND_CLIENT_FEE_SHARE } from './constants'

const isFyndSupportedChainId = (chainId: ChainId): chainId is FyndSupportedChainId =>
  chainId in FYND_CHAINS

export const getFyndClientFeeBps = (affiliateBps: string): number =>
  bn(affiliateBps).div(FYND_CLIENT_FEE_SHARE).integerValue(BigNumber.ROUND_CEIL).toNumber()

export const convertAssetIdToFyndToken = (assetId: AssetId): Address => {
  const { assetReference } = fromAssetId(assetId)
  if (isNativeEvmAsset(assetId)) return zeroAddress
  return getAddress(assetReference)
}

export const assertValidTrade = ({
  sellAsset,
  buyAsset,
  chainId,
}: {
  sellAsset: Asset
  buyAsset: Asset
  chainId: ChainId
}): Result<FyndSupportedChainId, SwapErrorRight> => {
  if (!isFyndSupportedChainId(sellAsset.chainId) || !isFyndSupportedChainId(buyAsset.chainId)) {
    return Err<FyndSupportedChainId, SwapErrorRight>(
      makeSwapErrorRight({
        message: 'Fynd only supports configured EVM chains',
        code: TradeQuoteError.UnsupportedChain,
      }),
    )
  }

  if (sellAsset.chainId !== buyAsset.chainId) {
    return Err<FyndSupportedChainId, SwapErrorRight>(
      makeSwapErrorRight({
        message: 'Fynd does not support cross-chain trades',
        code: TradeQuoteError.CrossChainNotSupported,
      }),
    )
  }

  const validAssets = [sellAsset, buyAsset].every(asset => {
    const assetParts = asset.assetId.split('/')
    const [assetChainId, assetReference] = assetParts
    return (
      assetParts.length === 2 &&
      assetChainId === asset.chainId &&
      ((assetReference?.startsWith('slip44:') && isNativeEvmAsset(asset.assetId)) ||
        (assetReference?.startsWith('erc20:') &&
          isAddress(assetReference.slice(6)) &&
          assetReference.slice(6).toLowerCase() !== zeroAddress))
    )
  })
  if (!validAssets || chainId !== sellAsset.chainId) {
    return Err<FyndSupportedChainId, SwapErrorRight>(
      makeSwapErrorRight({
        message: 'Invalid Fynd assets or chain',
        code: TradeQuoteError.UnsupportedChain,
      }),
    )
  }
  return Ok<FyndSupportedChainId, SwapErrorRight>(sellAsset.chainId)
}

const isFyndErrorResponse = (value: unknown): value is FyndErrorResponse =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as FyndErrorResponse).error === 'string' &&
  typeof (value as FyndErrorResponse).code === 'string'

// The proxy forwards Fynd's status and `{ error, code }` body as-is
export const getFyndRequestError = (error: SwapErrorRight): SwapErrorRight => {
  const { cause } = error
  if (!axios.isAxiosError(cause)) return error

  const status = cause.response?.status
  const body: unknown = cause.response?.data
  const code = isFyndErrorResponse(body) ? body.code : undefined
  const message = isFyndErrorResponse(body)
    ? `Fynd: ${body.error}`
    : `Fynd request failed${status ? ` with status ${status}` : ''}`

  if (status === 429) {
    return makeSwapErrorRight({
      message: 'Fynd rate limit exceeded',
      code: TradeQuoteError.RateLimitExceeded,
    })
  }
  if (code === 'NO_ROUTE_FOUND' || code === 'INSUFFICIENT_LIQUIDITY') {
    return makeSwapErrorRight({ message, code: TradeQuoteError.NoRouteFound })
  }
  if (code === 'TIMEOUT') {
    return makeSwapErrorRight({ message, code: TradeQuoteError.Timeout })
  }
  return makeSwapErrorRight({ message, code: TradeQuoteError.QueryFailed, cause })
}
