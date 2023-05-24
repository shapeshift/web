import type { AssetId } from '@shapeshiftoss/caip'

import type { Asset } from '../../src/lib/asset-service'

export const overrideAssets: Record<AssetId, Partial<Asset>> = {
  'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d': {
    name: 'Fox',
    color: '#3761F9',
    icon: 'https://assets.coincap.io/assets/icons/256/fox.png',
  },
  'eip155:100/erc20:0xddafbb505ad214d7b80b1f830fccc89b60fb7a83': {
    name: 'USD Coin on Gnosis',
    precision: 6,
  },
}
