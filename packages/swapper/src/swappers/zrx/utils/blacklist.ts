// Zrx doesnt have an easily accessible master assets list.
// We assume all erc20's are supported and remove these explicitely unsupported assets
export const UNSUPPORTED_ASSETS = Object.freeze([
  // Foxy token unsupported by zrx
  'eip155:1/erc20:0xdc49108ce5c57bc3408c3a5e95f3d864ec386ed3'
])
