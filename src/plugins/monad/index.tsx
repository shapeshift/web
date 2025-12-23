import { fromAssetId, monadChainId } from '@shapeshiftoss/caip'
import { monad } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'

import { getConfig } from '@/config'
import { getAssetServiceSync } from '@/lib/asset-service'
import type { Plugins } from '@/plugins/types'

// eslint-disable-next-line import/no-default-export
export default function register(): Plugins {
  return [
    [
      'monadChainAdapter',
      {
        name: 'monadChainAdapter',
        featureFlag: ['Monad'],
        providers: {
          chainAdapters: [
            [
              KnownChainIds.MonadMainnet,
              () => {
                // Get all Monad ERC20 tokens from asset service
                const assetService = getAssetServiceSync()
                const knownTokens = assetService.assets
                  .filter(asset => {
                    const { chainId, assetNamespace } = fromAssetId(asset.assetId)
                    return chainId === monadChainId && assetNamespace === 'erc20'
                  })
                  .map(asset => ({
                    assetId: asset.assetId,
                    contractAddress: fromAssetId(asset.assetId).assetReference,
                    symbol: asset.symbol,
                    name: asset.name,
                    precision: asset.precision,
                  }))

                return new monad.ChainAdapter({
                  rpcUrl: getConfig().VITE_MONAD_NODE_URL,
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
