import type { ChainId } from '@shapeshiftoss/caip'
import { evmChainIds } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'

import type { SupportedChainIds } from '../../../types'

export const DEFAULT_LIFI_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000000'
export const L1_GAS_ORACLE_ADDRESS = '0x420000000000000000000000000000000000000f' // optimism & base
export const L1_FEE_CHAIN_IDS = [KnownChainIds.OptimismMainnet, KnownChainIds.BaseMainnet]

// used for analytics and affiliate fee - do not change this without considering impact
export const LIFI_INTEGRATOR_ID = 'shapeshift'

export const LIFI_SUPPORTED_CHAIN_IDS: SupportedChainIds = {
  sell: evmChainIds as unknown as ChainId[],
  buy: evmChainIds as unknown as ChainId[],
}

export const LIFI_SHARED_FEES_STEP_NAME = 'LIFI Shared Fee'
