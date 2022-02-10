import { AssetIcon } from '../../components/AssetIcon'
import { Plugins } from '../index'
import { BitcoinPluginHomepage } from './BitcoinPluginHomepage'

export function register(): Plugins {
  return [
    [
      'bip122:000000000019d6689c085ae165831e93',
      {
        name: 'Bitcoin',
        icon: <AssetIcon src='https://assets.coincap.io/assets/icons/btc@2x.png' />,
        routes: {
          home: <BitcoinPluginHomepage />
        }
      }
    ]
  ]
}
