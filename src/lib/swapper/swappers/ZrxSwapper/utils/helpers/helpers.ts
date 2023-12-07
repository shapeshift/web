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
      return 'https://api.0x.org/'
    case KnownChainIds.AvalancheMainnet:
      return 'https://avalanche.api.0x.org/'
    case KnownChainIds.OptimismMainnet:
      return 'https://optimism.api.0x.org/'
    case KnownChainIds.BnbSmartChainMainnet:
      return 'https://bsc.api.0x.org/'
    case KnownChainIds.PolygonMainnet:
      return 'https://polygon.api.0x.org/'
    case KnownChainIds.ArbitrumMainnet:
      return 'https://arbitrum.api.0x.org/'
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
