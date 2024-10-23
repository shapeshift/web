import type { ChainId } from '@shapeshiftoss/caip'
import { KnownChainIds } from "@shapeshiftoss/types";

import { SupportedChainIds, SwapperName, SwapSource } from '../../types'
import { ChainflipSupportedChainIds } from './types'

export const CHAINFLIP_SUPPORTED_CHAIN_IDS: SupportedChainIds = {
  sell: ChainflipSupportedChainIds as unknown as ChainId[],
  buy: ChainflipSupportedChainIds as unknown as ChainId[],
}

export const CHAINFLIP_BOOST_SWAP_SOURCE: SwapSource = `${SwapperName.Chainflip} • Boost`
export const CHAINFLIP_DCA_SWAP_SOURCE: SwapSource = `${SwapperName.Chainflip} • DCA`
export const CHAINFLIP_DCA_BOOST_SWAP_SOURCE: SwapSource = `${SwapperName.Chainflip} • DCA • Boost`

export const chainIdToChainflipNetwork: Partial<Record<KnownChainIds, string>> = {
  [KnownChainIds.EthereumMainnet]: 'eth',
  [KnownChainIds.ArbitrumMainnet]: 'arb',
  [KnownChainIds.BitcoinMainnet]: 'btc',
  [KnownChainIds.SolanaMainnet]: 'sol',
  // TODO: Add Polkadot
}
