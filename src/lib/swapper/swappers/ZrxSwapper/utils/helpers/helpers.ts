import type { Asset } from '@shapeshiftoss/asset-service'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import {
  avalancheAssetId,
  bscAssetId,
  ethAssetId,
  fromAssetId,
  optimismAssetId,
  polygonAssetId,
} from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import type { SwapErrorRight } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapError, SwapErrorType } from 'lib/swapper/api'
import type { ZrxPriceResponse } from 'lib/swapper/swappers/ZrxSwapper/types'
import { zrxServiceFactory } from 'lib/swapper/swappers/ZrxSwapper/utils/zrxService'

import type { ZrxSupportedChainAdapter } from '../../ZrxSwapper'

export const baseUrlFromChainId = (chainId: string): Result<string, SwapErrorRight> => {
  switch (chainId) {
    case KnownChainIds.EthereumMainnet:
      return Ok('https://api.0x.org/')
    case KnownChainIds.AvalancheMainnet:
      return Ok('https://avalanche.api.0x.org/')
    case KnownChainIds.OptimismMainnet:
      return Ok('https://optimism.api.0x.org/')
    case KnownChainIds.BnbSmartChainMainnet:
      return Ok('https://bsc.api.0x.org/')
    case KnownChainIds.PolygonMainnet:
      return Ok('https://polygon.api.0x.org/')
    default:
      return Err(
        makeSwapErrorRight({
          message: `baseUrlFromChainId] - Unsupported chainId: ${chainId}`,
          code: SwapErrorType.UNSUPPORTED_CHAIN,
        }),
      )
  }
}

export const usdcContractAddressFromChainId = (chainId: ChainId): string => {
  switch (chainId) {
    case KnownChainIds.EthereumMainnet:
      return '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
    case KnownChainIds.AvalancheMainnet:
      return '0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e'
    case KnownChainIds.OptimismMainnet:
      return '0x7f5c764cbc14f9669b88837ca1490cca17c31607'
    case KnownChainIds.BnbSmartChainMainnet:
      return '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d'
    case KnownChainIds.PolygonMainnet:
      return '0x2791bca1f2de4661ed88a30c99a7a9449aa84174'
    default:
      throw new SwapError(`usdcContractFromChainId] - Unsupported chainId: ${chainId}`, {
        code: SwapErrorType.UNSUPPORTED_CHAIN,
      })
  }
}

export const isNativeEvmAsset = (assetId: AssetId): boolean => {
  const { chainId } = fromAssetId(assetId)
  switch (chainId) {
    case KnownChainIds.EthereumMainnet:
      return assetId === ethAssetId
    case KnownChainIds.AvalancheMainnet:
      return assetId === avalancheAssetId
    case KnownChainIds.OptimismMainnet:
      return assetId === optimismAssetId
    case KnownChainIds.BnbSmartChainMainnet:
      return assetId === bscAssetId
    case KnownChainIds.PolygonMainnet:
      return assetId === polygonAssetId
    default:
      return false
  }
}

// converts an asset to zrx token (symbol or contract address)
export const assetToToken = (asset: Asset): string => {
  const { assetReference, assetNamespace } = fromAssetId(asset.assetId)
  return assetNamespace === 'slip44' ? asset.symbol : assetReference
}

export const getUsdRate = async (sellAsset: Asset): Promise<Result<string, SwapErrorRight>> => {
  const usdcContractAddress = usdcContractAddressFromChainId(sellAsset.chainId)
  const sellAssetContractAddress = fromAssetId(sellAsset.assetId).assetReference

  if (sellAssetContractAddress === usdcContractAddress) return Ok('1') // Will break if comparing against usdc

  const maybeBaseUrl = baseUrlFromChainId(sellAsset.chainId)
  if (maybeBaseUrl.isErr()) return Err(maybeBaseUrl.unwrapErr())
  const zrxService = zrxServiceFactory(maybeBaseUrl.unwrap())
  const maybeRateResponse = await zrxService.get<ZrxPriceResponse>('/swap/v1/price', {
    params: {
      buyToken: usdcContractAddress,
      buyAmount: '1000000000', // rate is imprecise for low $ values, hence asking for $1000
      sellToken: assetToToken(sellAsset),
    },
  })

  return maybeRateResponse
    .map(rateResponse => {
      const price = bnOrZero(rateResponse.data?.price)
      return price
    })
    .andThen<string>(price => {
      if (!price.gt(0))
        return Err(
          makeSwapErrorRight({
            message: '[getUsdRate] - Failed to get price data',
            code: SwapErrorType.RESPONSE_ERROR,
          }),
        )
      return Ok(bn(1).dividedBy(price).toString())
    })
}

export const assertValidTradePair = ({
  buyAsset,
  sellAsset,
  adapter,
}: {
  buyAsset: Asset
  sellAsset: Asset
  adapter: ZrxSupportedChainAdapter
}): Result<boolean, SwapErrorRight> => {
  const chainId = adapter.getChainId()

  if (buyAsset.chainId === chainId && sellAsset.chainId === chainId) return Ok(true)

  return Err(
    makeSwapErrorRight({
      message: `[assertValidTradePair] - both assets must be on chainId ${chainId}`,
      code: SwapErrorType.UNSUPPORTED_PAIR,
      details: {
        buyAssetChainId: buyAsset.chainId,
        sellAssetChainId: sellAsset.chainId,
      },
    }),
  )
}
