// Zrx doesnt have an easily accessible master assets list.
// We assume all erc20's are supported and remove these explicitely unsupported assets
export const UNSUPPORTED_ASSETS = Object.freeze([
  // Foxy token unsupported by zrx
  'eip155:1/erc20:0xdc49108ce5c57bc3408c3a5e95f3d864ec386ed3',
  /**
   * ERC20 RUNE - we don't want people buying this instead of native RUNE
   * as it's exchangeable value for native RUNE is currently decaying from 1 towards 0
   */
  'eip155:1/erc20:0x3155ba85d5f96b2d030a4966af206230e46849cb',
])
