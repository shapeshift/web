import { FeatureFlag } from 'constants/FeatureFlag'
import { Plugins } from 'plugins'
import { AssetIcon } from 'components/AssetIcon'

import { BitcoinPluginHomepage } from './BitcoinPluginHomepage'

export function register(): Plugins {
  return [
    [
      'bip122:000000000019d6689c085ae165831e93',
      {
        disabled: !FeatureFlag.Plugin.Bitcoin,
        name: 'Bitcoin',
        icon: <AssetIcon src='https://assets.coincap.io/assets/icons/btc@2x.png' />,
        routes: {
          home: <BitcoinPluginHomepage />
        }
      }
    ]
  ]
}
