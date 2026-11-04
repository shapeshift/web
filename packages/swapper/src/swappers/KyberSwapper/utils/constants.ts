import { KnownChainIds } from '@shapeshiftoss/types'
import type { TreasuryChainId } from '@shapeshiftoss/utils'
import type { Address } from 'viem'
import { parseAbi } from 'viem'

export const KYBER_CLIENT_ID = 'shapeshift'
export const KYBER_DEADLINE_SECONDS = 1200

export const KYBER_CHAINS = {
  [KnownChainIds.MonadMainnet]: 'monad',
  [KnownChainIds.HyperEvmMainnet]: 'hyperevm',
  [KnownChainIds.MegaEthMainnet]: 'megaeth',
  [KnownChainIds.PlasmaMainnet]: 'plasma',
} as const satisfies Partial<Record<TreasuryChainId, string>>

export type KyberSupportedChainId = keyof typeof KYBER_CHAINS

// MetaAggregationRouterV2, same address on every chain: https://docs.kyberswap.com/developer-guide/aggregator-api/contracts
export const KYBER_ROUTER_ADDRESS: Address = '0x6131B5fae19EA4f9D964eAc0408E4408b66337b5'
export const KYBER_NATIVE_TOKEN: Address = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

// _FEE_ON_DST | _FEE_IN_BPS; builds also set an undocumented 0x200 bit, so never compare whole flags
export const KYBER_FEE_FLAGS = 0xc0n

export const KYBER_ROUTER_ABI = parseAbi([
  'struct SwapDescriptionV2 { address srcToken; address dstToken; address[] srcReceivers; uint256[] srcAmounts; address[] feeReceivers; uint256[] feeAmounts; address dstReceiver; uint256 amount; uint256 minReturnAmount; uint256 flags; bytes permit; }',
  'struct SwapExecutionParams { address callTarget; address approveTarget; bytes targetData; SwapDescriptionV2 desc; bytes clientData; }',
  'function swap(SwapExecutionParams execution) payable returns (uint256 returnAmount, uint256 gasUsed)',
])
