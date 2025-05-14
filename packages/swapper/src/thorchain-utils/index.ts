import type { AssetId } from '@shapeshiftoss/caip'
import * as adapters from '@shapeshiftoss/chain-adapters'

import { isCacao, MAYA_PRECISION, MAYACHAIN_STREAM_SWAP_SOURCE } from '../swappers/MayachainSwapper'
import * as mayachain from '../swappers/MayachainSwapper/utils/poolAssetHelpers/poolAssetHelpers'
import {
  isRune,
  THOR_PRECISION,
  THORCHAIN_LONGTAIL_STREAMING_SWAP_SOURCE,
  THORCHAIN_LONGTAIL_SWAP_SOURCE,
  THORCHAIN_STREAM_SWAP_SOURCE,
} from '../swappers/ThorchainSwapper'
import { THORCHAIN_AFFILIATE_NAME } from '../swappers/ThorchainSwapper/utils/constants'
import * as thorchain from '../swappers/ThorchainSwapper/utils/poolAssetHelpers/poolAssetHelpers'
import type { SwapperConfig, SwapSource, TradeQuote, TradeRate } from '../types'
import { SwapperName } from '../types'
import type { ThorTradeQuote, ThorTradeRate } from './types'
import { TradeType } from './types'

export * from './checkTradeStatus'
export * from './getInboundAddressDataForChain'
export * from './memo'
export * from './routerCallData/routerCalldata'
export * from './service'
export * from './types'
export * from './getL1RateOrQuote'

export * as cosmossdk from './cosmossdk'
export * as evm from './evm'
export * as utxo from './utxo'

export const isThorTradeRate = (quote: TradeRate | undefined): quote is ThorTradeRate =>
  !!quote && 'tradeType' in quote && 'vault' in quote

export const isThorTradeQuote = (quote: TradeQuote | undefined): quote is ThorTradeQuote =>
  !!quote && 'tradeType' in quote && 'vault' in quote

export const getDaemonUrl = (config: SwapperConfig, swapperName: SwapperName) => {
  switch (swapperName) {
    case SwapperName.Thorchain:
      return `${config.VITE_THORCHAIN_NODE_URL}/thorchain`
    case SwapperName.Mayachain:
      return `${config.VITE_MAYACHAIN_NODE_URL}/mayachain`
    default:
      throw new Error(`Invalid swapper: ${swapperName}`)
  }
}

export const getMidgardUrl = (config: SwapperConfig, swapperName: SwapperName) => {
  switch (swapperName) {
    case SwapperName.Thorchain:
      return config.VITE_THORCHAIN_MIDGARD_URL
    case SwapperName.Mayachain:
      return config.VITE_MAYACHAIN_MIDGARD_URL
    default:
      throw new Error(`Invalid swapper: ${swapperName}`)
  }
}

export const isNativeAsset = (assetId: AssetId, swapperName: SwapperName) => {
  switch (swapperName) {
    case SwapperName.Thorchain:
      return isRune(assetId)
    case SwapperName.Mayachain:
      return isCacao(assetId)
    default:
      throw new Error(`Invalid swapper: ${swapperName}`)
  }
}

export const getNativePrecision = (swapperName: SwapperName) => {
  switch (swapperName) {
    case SwapperName.Thorchain:
      return THOR_PRECISION
    case SwapperName.Mayachain:
      return MAYA_PRECISION
    default:
      throw new Error(`Invalid swapper: ${swapperName}`)
  }
}

export const getNativeFee = (swapperName: SwapperName) => {
  switch (swapperName) {
    case SwapperName.Thorchain:
      return adapters.thorchain.NATIVE_FEE
    case SwapperName.Mayachain:
      return adapters.mayachain.NATIVE_FEE
    default:
      throw new Error(`Invalid swapper: ${swapperName}`)
  }
}

export const getAffiliate = (swapperName: SwapperName) => {
  switch (swapperName) {
    case SwapperName.Thorchain:
      return THORCHAIN_AFFILIATE_NAME
    case SwapperName.Mayachain:
      return ''
    default:
      throw new Error(`Invalid swapper: ${swapperName}`)
  }
}

export const getPoolAssetId = ({
  assetId,
  swapperName,
}: {
  assetId: AssetId
  swapperName: SwapperName
}) => {
  switch (swapperName) {
    case SwapperName.Thorchain:
      return thorchain.assetIdToPoolAssetId({ assetId })
    case SwapperName.Mayachain:
      return mayachain.assetIdToPoolAssetId({ assetId })
    default:
      throw new Error(`Invalid swapper: ${swapperName}`)
  }
}

export const getSwapSource = (
  tradeType: TradeType,
  isStreaming: boolean,
  swapperName: SwapperName,
): SwapSource => {
  type SwapSources = Partial<
    Record<
      SwapperName,
      {
        streaming: Partial<Record<TradeType, SwapSource>>
        standard: Partial<Record<TradeType, SwapSource>>
      }
    >
  >
  const swapSources: SwapSources = {
    [SwapperName.Thorchain]: {
      streaming: {
        [TradeType.L1ToLongTail]: THORCHAIN_LONGTAIL_STREAMING_SWAP_SOURCE,
        [TradeType.LongTailToL1]: THORCHAIN_LONGTAIL_STREAMING_SWAP_SOURCE,
        [TradeType.LongTailToLongTail]: THORCHAIN_LONGTAIL_STREAMING_SWAP_SOURCE,
        [TradeType.L1ToL1]: THORCHAIN_STREAM_SWAP_SOURCE,
      },
      standard: {
        [TradeType.L1ToLongTail]: THORCHAIN_LONGTAIL_SWAP_SOURCE,
        [TradeType.LongTailToL1]: THORCHAIN_LONGTAIL_SWAP_SOURCE,
        [TradeType.LongTailToLongTail]: THORCHAIN_LONGTAIL_SWAP_SOURCE,
        [TradeType.L1ToL1]: SwapperName.Thorchain,
      },
    },
    [SwapperName.Mayachain]: {
      streaming: {
        [TradeType.L1ToL1]: MAYACHAIN_STREAM_SWAP_SOURCE,
      },
      standard: {
        [TradeType.L1ToL1]: SwapperName.Mayachain,
      },
    },
  }

  const mode = isStreaming ? 'streaming' : 'standard'

  const swapSource = swapSources[swapperName]?.[mode]?.[tradeType]

  if (!swapSource) {
    throw new Error(`No swap source defined: ${{ tradeType, isStreaming, swapperName }}`)
  }

  return swapSource
}
