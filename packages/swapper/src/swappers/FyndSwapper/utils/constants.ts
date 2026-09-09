import { KnownChainIds } from '@shapeshiftoss/types'
import type { Address } from 'viem'

export const FYND_SUPPORTED_CHAIN_IDS = [KnownChainIds.EthereumMainnet] as const
export type FyndSupportedChainId = (typeof FYND_SUPPORTED_CHAIN_IDS)[number]

export const FYND_NATIVE_ASSET_ADDRESS = '0x0000000000000000000000000000000000000000' as Address
export const FYND_RATE_ADDRESS = '0x0000000000000000000000000000000000000001' as Address
export const FYND_ROUTER_FEE_DIVISOR = '100000'
