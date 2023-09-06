import { KnownChainIds } from '@shapeshiftoss/types'
import { bn } from 'lib/bignumber/bignumber'
import type { ThorChainId } from 'lib/swapper/swappers/ThorchainSwapper/types'
import type { SwapSource } from 'lib/swapper/types'
import { SwapperName } from 'lib/swapper/types'
// TODO: read from https://daemon.thorchain.shapeshift.com/lcd/thorchain/constants
export const RUNE_OUTBOUND_TRANSACTION_FEE_CRYPTO_HUMAN = bn('0.02')

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
export const THORCHAIN_OUTBOUND_FEE_RUNE = '2000000'
