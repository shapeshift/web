import type { ChainId } from '@shapeshiftoss/caip'
import { evmChainIds } from '@shapeshiftoss/chain-adapters'
import type { SupportedChainIds } from '@shapeshiftoss/swapper'
import { KnownChainIds } from '@shapeshiftoss/types'

export const MIN_CROSS_CHAIN_AMOUNT_THRESHOLD_USD_HUMAN = 20 // arbitrary amount deemed by lifi devs to meet minimum amount across all brdiges
export const MIN_SAME_CHAIN_AMOUNT_THRESHOLD_USD_HUMAN = '0.01' // Same chain bridges can be of any amount, since fees are paid explicitly as miner fees in one chain
export const SELECTED_ROUTE_INDEX = 0 // default to first route - this is the highest ranking according to the query we send
export const DEFAULT_LIFI_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000000'
export const L1_GAS_ORACLE_ADDRESS = '0x420000000000000000000000000000000000000f' // optimism & base
export const L1_FEE_CHAIN_IDS = [KnownChainIds.OptimismMainnet, KnownChainIds.BaseMainnet]

// used for analytics and affiliate fee - do not change this without considering impact
export const LIFI_INTEGRATOR_ID = 'shapeshift'

export const LIFI_SUPPORTED_CHAIN_IDS: SupportedChainIds = {
  sell: evmChainIds as unknown as ChainId[],
  buy: evmChainIds as unknown as ChainId[],
}
