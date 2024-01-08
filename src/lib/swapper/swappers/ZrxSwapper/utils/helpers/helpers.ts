import type { ChainId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import type { SwapErrorRight } from '@shapeshiftoss/swapper'
import { makeSwapErrorRight, SwapErrorType } from '@shapeshiftoss/swapper'
import type { Asset } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { assertUnreachable } from 'lib/utils'
import { isEvmChainAdapter } from 'lib/utils/evm'

import type { ZrxSupportedChainId } from '../../types'
import { zrxSupportedChainIds } from '../../types'

export const baseUrlFromChainId = (chainId: ZrxSupportedChainId): string => {
  switch (chainId) {
    case KnownChainIds.EthereumMainnet:
      return 'https://0x.shapeshift.com/ethereum/'
    case KnownChainIds.AvalancheMainnet:
      return 'https://0x.shapeshift.com/avalanche/'
    case KnownChainIds.OptimismMainnet:
      return 'https://0x.shapeshift.com/optimism/'
    case KnownChainIds.BnbSmartChainMainnet:
      return 'https://0x.shapeshift.com/bnbsmartchain/'
    case KnownChainIds.PolygonMainnet:
      return 'https://0x.shapeshift.com/polygon/'
    case KnownChainIds.ArbitrumMainnet:
      return 'https://0x.shapeshift.com/arbitrum/'
    default:
      assertUnreachable(chainId)
  }
}

// converts an asset to zrx token (symbol or contract address)
export const assetToToken = (asset: Asset): string => {
  const { assetReference, assetNamespace } = fromAssetId(asset.assetId)
  return assetNamespace === 'slip44' ? asset.symbol : assetReference
}

export const isSupportedChainId = (chainId: ChainId): chainId is ZrxSupportedChainId => {
  return zrxSupportedChainIds.includes(chainId as ZrxSupportedChainId)
}

export const getAdapter = (
  chainId: ChainId | KnownChainIds,
): Result<EvmChainAdapter, SwapErrorRight> => {
  const chainAdapterManager = getChainAdapterManager()
  const adapter = chainAdapterManager.get(chainId)

  if (!isEvmChainAdapter(adapter)) {
    return Err(
      makeSwapErrorRight({
        message: '[Zrx: getAdapter] - invalid chain adapter',
        code: SwapErrorType.UNSUPPORTED_NAMESPACE,
        details: { chainId },
      }),
    )
  }

  return Ok(adapter)
}
