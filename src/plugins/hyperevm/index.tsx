import { fromAssetId, hyperEvmChainId } from '@shapeshiftoss/caip'
import { hyperevm } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'

import { getConfig } from '@/config'
import { getAssetServiceSync } from '@/lib/asset-service'
import type { Plugins } from '@/plugins/types'

// eslint-disable-next-line import/no-default-export
export default function register(): Plugins {
  return [
    [
      'hyperevmChainAdapter',
      {
        name: 'hyperevmChainAdapter',
        featureFlag: ['HyperEvm'],
        providers: {
          chainAdapters: [
            [
              KnownChainIds.HyperEvmMainnet,
              () => {
                // Get all HyperEVM ERC20 tokens from asset service
                const assetService = getAssetServiceSync()
                const knownTokens = assetService.assets
                  .filter(asset => {
                    const { chainId, assetNamespace } = fromAssetId(asset.assetId)
                    return chainId === hyperEvmChainId && assetNamespace === 'erc20'
                  })
                  .map(asset => ({
                    assetId: asset.assetId,
                    contractAddress: fromAssetId(asset.assetId).assetReference,
                    symbol: asset.symbol,
                    name: asset.name,
                    precision: asset.precision,
                  }))

                return new hyperevm.ChainAdapter({
                  rpcUrl: getConfig().VITE_HYPEREVM_NODE_URL,
                  knownTokens,
                })
              },
            ],
          ],
        },
      },
    ],
  ]
}
