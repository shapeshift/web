import { KnownChainIds } from '@shapeshiftoss/types'
import type { ThorChainId } from 'lib/swapper/swappers/ThorchainSwapper/types'
import type { SwapSource } from 'lib/swapper/types'
import { SwapperName } from 'lib/swapper/types'

export const sellSupportedChainIds: Record<ThorChainId, boolean> = {
  [KnownChainIds.EthereumMainnet]: true,
  [KnownChainIds.BitcoinMainnet]: true,
  [KnownChainIds.DogecoinMainnet]: true,
  [KnownChainIds.LitecoinMainnet]: true,
  [KnownChainIds.BitcoinCashMainnet]: true,
  [KnownChainIds.CosmosMainnet]: true,
  [KnownChainIds.ThorchainMainnet]: true,
  [KnownChainIds.AvalancheMainnet]: true,
}

export const buySupportedChainIds: Record<ThorChainId, boolean> = {
  [KnownChainIds.EthereumMainnet]: true,
  [KnownChainIds.BitcoinMainnet]: true,
  [KnownChainIds.DogecoinMainnet]: true,
  [KnownChainIds.LitecoinMainnet]: true,
  [KnownChainIds.BitcoinCashMainnet]: true,
  [KnownChainIds.CosmosMainnet]: true,
  [KnownChainIds.ThorchainMainnet]: true,
  [KnownChainIds.AvalancheMainnet]: true,
}

export const THORCHAIN_STREAM_SWAP_SOURCE: SwapSource = `${SwapperName.Thorchain} • Streaming`

// https://dev.thorchain.org/thorchain-dev/interface-guide/fees#thorchain-native-rune
// static automatic outbound fee as defined by: https://thornode.ninerealms.com/thorchain/constants
// expressed in thor units (8 decimals of precision)
export const THORCHAIN_OUTBOUND_FEE_RUNE_THOR_UNIT = '2000000'
