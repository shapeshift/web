import { FeatureFlag } from 'constants/FeatureFlag'
import { Plugins } from 'plugins'
import { AssetIcon } from 'components/AssetIcon'

import { AssetRightSidebar } from '../../pages/Assets/AssetRightSidebar'
import { AssetSidebar } from '../../pages/Assets/AssetSidebar'
import { CosmosAsset } from './CosmosAsset'

export function register(): Plugins {
  return [
    [
      'cosmos:cosmoshub-4',
      {
        disabled: !FeatureFlag.Plugin.Cosmos,
        name: 'plugins.cosmos.navBar',
        icon: <AssetIcon src='https://assets.coincap.io/assets/icons/atom@2x.png' />,
        routes: [
          {
            path: '/assets/cosmos\\:osmosis-1/:assetSubId',
            label: '',
            main: <CosmosAsset chainId={'cosmos:osmosis-1'} />,
            icon: <AssetIcon src='https://assets.coincap.io/assets/icons/atom@2x.png' />,
            leftSidebar: <AssetSidebar />,
            rightSidebar: <AssetRightSidebar />
          },
          {
            path: '/assets/cosmos\\:cosmoshub-4/:assetSubId',
            label: '',
            main: <CosmosAsset chainId={'cosmos:cosmoshub-4'} />,
            icon: <AssetIcon src='https://assets.coincap.io/assets/icons/atom@2x.png' />,
            leftSidebar: <AssetSidebar />,
            rightSidebar: <AssetRightSidebar />
          }
        ]
      }
    ]
  ]
}
