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
