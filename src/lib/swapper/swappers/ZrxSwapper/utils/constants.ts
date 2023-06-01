import { KnownChainIds } from '@shapeshiftoss/types'
import type { SwapSource } from 'lib/swapper/api'
import { SwapperName } from 'lib/swapper/api'

export const MAX_ZRX_TRADE = '100000000000000000000000000'
export const DEFAULT_SOURCE: SwapSource[] = [{ name: SwapperName.Zrx, proportion: '1' }]
export const AFFILIATE_ADDRESS = '0xc770eefad204b5180df6a14ee197d99d808ee52d'
export const OPTIMISM_L1_SWAP_GAS_LIMIT = '50000'

// Zrx doesnt have an easily accessible master assets list.

// We assume all erc20's are supported and remove these explicitely unsupported assets
export const ZRX_UNSUPPORTED_ASSETS = Object.freeze([
  // Foxy token unsupported by zrx
  'eip155:1/erc20:0xdc49108ce5c57bc3408c3a5e95f3d864ec386ed3',
  /**
   * ERC20 RUNE - we don't want people buying this instead of native RUNE
   * as it's exchangeable value for native RUNE is currently decaying from 1 towards 0
   */
  'eip155:1/erc20:0x3155ba85d5f96b2d030a4966af206230e46849cb',
])

export const ZRX_SUPPORTED_CHAINIDS = Object.freeze([
  KnownChainIds.EthereumMainnet,
  KnownChainIds.AvalancheMainnet,
  KnownChainIds.OptimismMainnet,
  KnownChainIds.BnbSmartChainMainnet,
  KnownChainIds.PolygonMainnet,
])
