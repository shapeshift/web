import { KnownChainIds } from '@shapeshiftoss/types'

// Zrx doesn't have an easily accessible master assets list.
// We assume all erc20's are supported and remove these explicitly unsupported assets
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
  KnownChainIds.ArbitrumMainnet,
  KnownChainIds.BaseMainnet,
])

// https://0x.org/docs/developer-resources/faqs-and-troubleshooting
export const ZRX_NATIVE_ASSET_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
