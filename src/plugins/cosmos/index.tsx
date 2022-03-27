import { cosmossdk } from '@shapeshiftoss/chain-adapters'
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
                const http = new unchained.cosmos.V1Api(
                  new unchained.cosmos.Configuration({
                    basePath: getConfig().REACT_APP_UNCHAINED_COSMOS_HTTP_URL
                  })
                )

                const ws = new unchained.ws.Client<unchained.cosmos.Tx>(
                  getConfig().REACT_APP_UNCHAINED_COSMOS_WS_URL
                )

                return new cosmossdk.cosmos.ChainAdapter({
                  providers: { http, ws },
                  coinName: 'Cosmos'
                })
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
