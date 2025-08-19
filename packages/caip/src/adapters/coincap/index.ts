import invert from 'lodash/invert'
import toLower from 'lodash/toLower'

import * as bip122_00000000001a91e3dace36e2be3bf030 from './generated/bip122_00000000001a91e3dace36e2be3bf030/adapter.json'
import * as bip122_12a765e31ffd4059bada1e25190f6e98 from './generated/bip122_12a765e31ffd4059bada1e25190f6e98/adapter.json'
import * as bip122_000000000019d6689c085ae165831e93 from './generated/bip122_000000000019d6689c085ae165831e93/adapter.json'
import * as bip122_000000000000000000651ef99cb9fcbe from './generated/bip122_000000000000000000651ef99cb9fcbe/adapter.json'
import * as cosmos_cosmoshub_4 from './generated/cosmos_cosmoshub-4/adapter.json'
import * as cosmos_thorchain_1 from './generated/cosmos_thorchain-1/adapter.json'
import * as eip155_1 from './generated/eip155_1/adapter.json'
import * as eip155_10 from './generated/eip155_10/adapter.json'
import * as eip155_56 from './generated/eip155_56/adapter.json'
import * as eip155_137 from './generated/eip155_137/adapter.json'
import * as eip155_8453 from './generated/eip155_8453/adapter.json'
import * as eip155_42161 from './generated/eip155_42161/adapter.json'
import * as eip155_43114 from './generated/eip155_43114/adapter.json'
import * as solana_5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp from './generated/solana_5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/adapter.json'

export const adapters = {
  eip155_1,
  eip155_10,
  eip155_56,
  eip155_137,
  eip155_8453,
  eip155_42161,
  eip155_43114,
  bip122_000000000019d6689c085ae165831e93,
  bip122_000000000000000000651ef99cb9fcbe,
  bip122_00000000001a91e3dace36e2be3bf030,
  bip122_12a765e31ffd4059bada1e25190f6e98,
  cosmos_cosmoshub_4,
  cosmos_thorchain_1,
  solana_5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp,
}

export const baseUrl = 'https://rest.coincap.io/v3'
const apiKey = process.env.VITE_COINCAP_API_KEY || process.env.COINCAP_API_KEY || ''
export const coincapAssetUrl = `${baseUrl}/assets?limit=2000&apiKey=${apiKey}`

const generatedAssetIdToCoinCapMap = Object.values(adapters).reduce((acc, cur) => ({
  ...acc,
  ...cur,
})) as Record<string, string>

const generatedCoinCapToAssetIdMap: Record<string, string> = invert(generatedAssetIdToCoinCapMap)

export const coincapToAssetId = (id: string): string | undefined => generatedCoinCapToAssetIdMap[id]

export const assetIdToCoinCap = (assetId: string): string | undefined =>
  generatedAssetIdToCoinCapMap[toLower(assetId)]
