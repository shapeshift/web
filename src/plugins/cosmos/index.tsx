import { Plugins } from 'plugins'
import { AssetIcon } from 'components/AssetIcon'

import { CosmosPluginHomepage } from './CosmosPluginHomepage'

export function register(): Plugins {
  return [
    [
      'cosmos:cosmoshub-4',
      {
        name: 'Cosmos',
        icon: <AssetIcon src='https://assets.coincap.io/assets/icons/atom@2x.png' />,
        routes: {
          home: <CosmosPluginHomepage />
        }
      }
    ]
  ]
}
