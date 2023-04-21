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
import type { AxiosResponse } from 'axios'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { SwapError, SwapErrorType } from 'lib/swapper/api'
import type { ZrxPriceResponse } from 'lib/swapper/swappers/ZrxSwapper/types'
import { zrxServiceFactory } from 'lib/swapper/swappers/ZrxSwapper/utils/zrxService'

export const baseUrlFromChainId = (chainId: string): string => {
  switch (chainId) {
    case KnownChainIds.EthereumMainnet:
      return 'https://api.0x.org/'
    case KnownChainIds.AvalancheMainnet:
      return 'https://avalanche.api.0x.org/'
    case KnownChainIds.OptimismMainnet:
      return 'https://optimism.api.0x.org/'
    case KnownChainIds.BnbSmartChainMainnet:
      return 'https://bsc.api.0x.org/'
    case KnownChainIds.PolygonMainnet:
      return 'https://polygon.api.0x.org/'
    default:
      throw new SwapError(`baseUrlFromChainId] - Unsupported chainId: ${chainId}`, {
        code: SwapErrorType.UNSUPPORTED_CHAIN,
      })
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

export const getUsdRate = async (sellAsset: Asset): Promise<string> => {
  try {
    const usdcContractAddress = usdcContractAddressFromChainId(sellAsset.chainId)
    const sellAssetContractAddress = fromAssetId(sellAsset.assetId).assetReference

    if (sellAssetContractAddress === usdcContractAddress) return '1' // Will break if comparing against usdc

    const baseUrl = baseUrlFromChainId(sellAsset.chainId)
    const zrxService = zrxServiceFactory(baseUrl)
    const rateResponse: AxiosResponse<ZrxPriceResponse> = await zrxService.get<ZrxPriceResponse>(
      '/swap/v1/price',
      {
        params: {
          buyToken: usdcContractAddress,
          buyAmount: '1000000000', // rate is imprecise for low $ values, hence asking for $1000
          sellToken: assetToToken(sellAsset),
        },
      },
    )

    const price = bnOrZero(rateResponse.data.price)
    if (!price.gt(0))
      throw new SwapError('[getUsdRate] - Failed to get price data', {
        code: SwapErrorType.RESPONSE_ERROR,
      })

    return bn(1).dividedBy(price).toString()
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[getUsdRate]', {
      cause: e,
      code: SwapErrorType.USD_RATE_FAILED,
    })
  }
}
