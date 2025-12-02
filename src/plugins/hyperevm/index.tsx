import { fromAssetId, hyperEvmChainId } from '@shapeshiftoss/caip'
import { hyperevm } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'

import { getConfig } from '@/config'
import { getAssetService } from '@/lib/asset-service'
import type { Plugins } from '@/plugins/types'

export default function register(): Plugins {
  console.log('[HyperEVM Plugin] Registering HyperEVM plugin')
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
                console.log('[HyperEVM Plugin] Creating HyperEVM chain adapter')
                // Get all HyperEVM ERC20 tokens from asset service
                const assetService = getAssetService()
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

                console.log('[HyperEVM Plugin] Found', knownTokens.length, 'HyperEVM tokens')

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
