import { KnownChainIds } from '@shapeshiftoss/types'
import type { Address } from 'viem'
import { parseAbi } from 'viem'

// The two LCX Liberty DEX routers, each deployed at one address on every chain it serves
const LCX_LIBERTY_ROUTER: Address = '0x0000000000b1ae06c96aB73FF4360d7AeAaB56F0'
const LCX_LIBERTY_ROUTER_2: Address = '0x0000000000654902B6Ed6cC240cc81CB4c4a3dff'

export const LCX_LIBERTY_ROUTER_BY_CHAIN_ID = {
  [KnownChainIds.EthereumMainnet]: LCX_LIBERTY_ROUTER,
  [KnownChainIds.BaseMainnet]: LCX_LIBERTY_ROUTER,
  [KnownChainIds.ArbitrumMainnet]: LCX_LIBERTY_ROUTER,
  [KnownChainIds.OptimismMainnet]: LCX_LIBERTY_ROUTER,
  [KnownChainIds.BnbSmartChainMainnet]: LCX_LIBERTY_ROUTER_2,
  [KnownChainIds.PolygonMainnet]: LCX_LIBERTY_ROUTER_2,
  [KnownChainIds.AvalancheMainnet]: LCX_LIBERTY_ROUTER_2,
  [KnownChainIds.RobinhoodMainnet]: LCX_LIBERTY_ROUTER_2,
  [KnownChainIds.UnichainMainnet]: LCX_LIBERTY_ROUTER_2,
  [KnownChainIds.MonadMainnet]: LCX_LIBERTY_ROUTER_2,
  [KnownChainIds.HyperEvmMainnet]: LCX_LIBERTY_ROUTER_2,
} as const satisfies Record<string, Address>

export type LcxLibertySupportedChainId = keyof typeof LCX_LIBERTY_ROUTER_BY_CHAIN_ID

export const LCX_LIBERTY_MAX_SLIPPAGE_BPS = 2000
export const LCX_LIBERTY_DEADLINE_SECONDS = 900

// The pool-routed entrypoint /v1/build sends to the core router
export const LCX_LIBERTY_ROUTER_ABI = parseAbi([
  'struct Hop { uint8 family; address pool; address tokenIn; address tokenOut; uint256 aux; }',
  'struct Leg { uint256 amountIn; Hop[] hops; }',
  'function swapSplit(address tokenIn, address tokenOut, uint256 totalIn, uint256 minAmountOut, address recipient, uint256 deadline, Leg[] legs) payable returns (uint256)',
])
