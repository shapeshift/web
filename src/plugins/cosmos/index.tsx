import { ChainAdapter as CosmosChainAdapter } from '@shapeshiftoss/chain-adapters/dist/cosmossdk/cosmos'
import { ChainAdapter as OsmosisChainAdapter } from '@shapeshiftoss/chain-adapters/dist/cosmossdk/osmosis'
import { ChainTypes } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'
import { getConfig } from 'config'
import { Plugins } from 'plugins'
import { AssetIcon } from 'components/AssetIcon'

import { CosmosAsset } from './CosmosAsset'

export function register(): Plugins {
  return [
    [
      'cosmos:cosmoshub-4',
      {
        name: 'plugins.cosmos.navBar',
        icon: <AssetIcon src='https://assets.coincap.io/assets/icons/atom@2x.png' />,
        featureFlag: 'CosmosPlugin',
        providers: {
          chainAdapters: [
            [
              ChainTypes.Cosmos,
              () => {
                const http = new unchained.cosmos.api.V1Api(
                  new unchained.cosmos.api.Configuration({
                    basePath: getConfig().REACT_APP_UNCHAINED_COSMOS_HTTP_URL
                  })
                )

                return new CosmosChainAdapter({ providers: { http }, coinName: 'Cosmos' })
              }
            ],
            [
              ChainTypes.Osmosis,
              () => {
                const http = new unchained.cosmos.api.V1Api(
                  new unchained.cosmos.api.Configuration({
                    basePath: getConfig().REACT_APP_UNCHAINED_COSMOS_HTTP_URL
                  })
                )

                return new OsmosisChainAdapter({ providers: { http }, coinName: 'Osmosis' })
              }
            ]
          ]
        },
        routes: [
          {
            path: '/assets/cosmos\\:osmosis-1/:assetSubId',
            hide: true,
            label: '',
            main: () => <CosmosAsset chainId={'cosmos:osmosis-1'} />,
            icon: <AssetIcon src='https://assets.coincap.io/assets/icons/atom@2x.png' />
          },
          {
            path: '/assets/cosmos\\:cosmoshub-4/:assetSubId',
            label: '',
            hide: true,
            main: () => <CosmosAsset chainId={'cosmos:cosmoshub-4'} />,
            icon: <AssetIcon src='https://assets.coincap.io/assets/icons/atom@2x.png' />
          }
        ]
      }
    ]
  ]
}
