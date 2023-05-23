import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import type BigNumber from 'bignumber.js'
import { bn } from 'lib/bignumber/bignumber'

import {
  WAVAX_ASSET_ID,
  WBNB_ASSET_ID,
  WETH_ASSET_ID,
  WOP_ASSET_ID,
  WXDAI_ASSET_ID,
} from './constants'
import type { OneInchBaseResponse } from './types'

export const getRate = (quoteResponse: OneInchBaseResponse): BigNumber => {
  const fromTokenAmountDecimal = bn(quoteResponse.fromTokenAmount).div(
    bn(10).pow(quoteResponse.fromToken.decimals),
  )
  const toTokenAmountDecimal = bn(quoteResponse.toTokenAmount).div(
    bn(10).pow(quoteResponse.toToken.decimals),
  )
  return toTokenAmountDecimal.div(fromTokenAmountDecimal)
}

export const getNativeWrappedAssetId = (chainId: ChainId): AssetId => {
  switch (chainId) {
    case KnownChainIds.EthereumMainnet:
      return WETH_ASSET_ID
    case KnownChainIds.BnbSmartChainMainnet:
      return WBNB_ASSET_ID
    // TODO: We should double check that the fee calculations work correctly on optimism and using this wETH contract.
    case KnownChainIds.OptimismMainnet:
      return WOP_ASSET_ID
    case KnownChainIds.AvalancheMainnet:
      return WAVAX_ASSET_ID
    case KnownChainIds.GnosisMainnet:
      return WXDAI_ASSET_ID
    default:
      throw new Error(`${chainId} not supported`)
  }
}
