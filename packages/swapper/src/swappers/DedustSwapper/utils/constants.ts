import { KnownChainIds } from '@shapeshiftoss/types'

export const DEDUST_SUPPORTED_CHAIN_IDS = [KnownChainIds.TonMainnet] as const

export const DEDUST_DEFAULT_SLIPPAGE_BPS = 100

export const DEDUST_QUOTE_TIMEOUT_MS = 30000

export const DEDUST_TON_V4_ENDPOINT = 'https://mainnet-v4.tonhubapi.com'

export const DEDUST_GAS_BUDGET_TON = '300000000'

export const DEDUST_GAS_BUDGET_JETTON = '350000000'
