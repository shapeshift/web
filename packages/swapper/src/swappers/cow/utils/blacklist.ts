// CowSwap doesnt have an easily accessible master assets list.
// We assume all erc20's are supported and remove these explicitely unsupported assets
export const COWSWAP_UNSUPPORTED_ASSETS = Object.freeze([
  // Foxy token unsupported by cowswap
  'eip155:1/erc20:0xdc49108ce5c57bc3408c3a5e95f3d864ec386ed3',
])
