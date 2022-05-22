import { cosmossdk } from '@shapeshiftoss/chain-adapters'
import { ChainTypes } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'
import { getConfig } from 'config'
import { Plugins } from 'plugins'
import { AssetIcon } from 'components/AssetIcon'

import { CosmosAccount } from './CosmosAccount'
import { CosmosAccountTxHistory } from './CosmosAccountTxHistory'
import { CosmosAsset } from './CosmosAsset'
import { CosmosAssetTxHistory } from './CosmostAssetTxHistory'

export function register(): Plugins {
  return [
    [
      'cosmos:cosmoshub-4',
      {
        name: 'plugins.cosmos.navBar',
        icon: <AssetIcon src='https://assets.coincap.io/assets/icons/atom@2x.png' />,
        providers: {
          chainAdapters: [
            [
              ChainTypes.Cosmos,
              () => {
                const http = new unchained.cosmos.V1Api(
                  new unchained.cosmos.Configuration({
                    basePath: getConfig().REACT_APP_UNCHAINED_COSMOS_HTTP_URL,
                  }),
                )

                const ws = new unchained.ws.Client<unchained.cosmos.Tx>(
                  getConfig().REACT_APP_UNCHAINED_COSMOS_WS_URL,
                )

                return new cosmossdk.cosmos.ChainAdapter({
                  providers: { http, ws },
                  coinName: 'Cosmos',
                })
              },
            ],
          ],
        },
        routes: [
          {
            path: '/assets/cosmos::chainRef/:assetSubId',
            hide: true,
            label: '',
            main: null,
            icon: <AssetIcon src='https://assets.coincap.io/assets/icons/atom@2x.png' />,
            routes: [
              {
                path: '/',
                label: 'navBar.overview',
                main: () => <CosmosAsset />,
              },
              {
                path: '/transactions',
                label: 'navBar.transactions',
                main: () => <CosmosAssetTxHistory />,
              },
            ],
          },
          {
            path: '/accounts/cosmos::accountSubId',
            label: '',
            hide: true,
            main: null,
            icon: <AssetIcon src='https://assets.coincap.io/assets/icons/atom@2x.png' />,
            routes: [
              {
                path: '/',
                label: 'navBar.overview',
                main: () => <CosmosAccount />,
              },
              {
                path: '/transactions',
                label: 'navBar.transactions',
                main: () => <CosmosAccountTxHistory />,
              },
            ],
          },
          {
            path: '/accounts/cosmos::accountSubId/:assetId',
            label: '',
            hide: true,
            main: null,
            icon: <AssetIcon src='https://assets.coincap.io/assets/icons/atom@2x.png' />,
            routes: [
              {
                path: '/',
                label: 'navBar.overview',
                main: () => <CosmosAccount />,
              },
              {
                path: '/transactions',
                label: 'navBar.transactions',
                main: () => <CosmosAccountTxHistory />,
              },
            ],
          },
        ],
      },
    ],
  ]
}
