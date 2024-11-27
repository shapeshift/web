import type { ChainId } from '@shapeshiftoss/caip'
import { bchChainId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import { isUtxoChainId } from '@shapeshiftoss/utils'

import type { SupportedChainIds, SwapSource } from '../../types'
import { SwapperName } from '../../types'

export const THOR_PRECISION = 8

export const sellSupportedChainIds: Record<ChainId, boolean> = {
  [KnownChainIds.EthereumMainnet]: true,
  [KnownChainIds.BitcoinMainnet]: true,
  [KnownChainIds.DogecoinMainnet]: true,
  [KnownChainIds.LitecoinMainnet]: true,
  [KnownChainIds.BitcoinCashMainnet]: true,
  [KnownChainIds.CosmosMainnet]: true,
  [KnownChainIds.ThorchainMainnet]: true,
  [KnownChainIds.AvalancheMainnet]: true,
  [KnownChainIds.BnbSmartChainMainnet]: true,
}

export const buySupportedChainIds: Record<ChainId, boolean> = {
  [KnownChainIds.EthereumMainnet]: true,
  [KnownChainIds.BitcoinMainnet]: true,
  [KnownChainIds.DogecoinMainnet]: true,
  [KnownChainIds.LitecoinMainnet]: true,
  [KnownChainIds.BitcoinCashMainnet]: true,
  [KnownChainIds.CosmosMainnet]: true,
  [KnownChainIds.ThorchainMainnet]: true,
  [KnownChainIds.AvalancheMainnet]: true,
  [KnownChainIds.BnbSmartChainMainnet]: true,
}

export const THORCHAIN_SUPPORTED_CHAIN_IDS: SupportedChainIds = {
  sell: Object.keys(sellSupportedChainIds),
  buy: Object.keys(buySupportedChainIds),
}

export const THORCHAIN_STREAM_SWAP_SOURCE: SwapSource = `${SwapperName.Thorchain} • Streaming`
export const THORCHAIN_LONGTAIL_SWAP_SOURCE: SwapSource = `${SwapperName.Thorchain} • Long-tail`
export const THORCHAIN_LONGTAIL_STREAMING_SWAP_SOURCE: SwapSource = `${SwapperName.Thorchain} • Long-tail streaming`

// https://dev.thorchain.org/thorchain-dev/interface-guide/fees#thorchain-native-rune
// static automatic outbound fee as defined by: https://daemon.thorchain.shapeshift.com/lcd/thorchain/constants
// expressed in thor units (8 decimals of precision)
export const THORCHAIN_OUTBOUND_FEE_RUNE_THOR_UNIT = '2000000'

export const BTC_MAXIMUM_BYTES_LENGTH = 80
export const BCH_MAXIMUM_BYTES_LENGTH = 220

export const getMaxBytesLengthByChainId = (chainId: ChainId) => {
  if (chainId === bchChainId) return BCH_MAXIMUM_BYTES_LENGTH
  if (isUtxoChainId(chainId)) return BTC_MAXIMUM_BYTES_LENGTH
  return Infinity
}
