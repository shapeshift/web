import {
  arbitrumAssetId,
  type AssetId,
  btcAssetId,
  type ChainId,
  ethAssetId,
  flipAssetId,
  solAssetId,
  usdcAssetId,
  usdcOnArbitrumOneAssetId,
  usdcOnSolanaAssetId,
  usdtAssetId,
} from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'

import type { SupportedChainIds, SwapSource } from '../../types'
import { SwapperName } from '../../types'

export const CHAINFLIP_REGULAR_QUOTE = 'regular'
export const CHAINFLIP_DCA_QUOTE = 'dca'
export const CHAINFLIP_BAAS_COMMISSION = 5

export const ChainflipSupportedChainIds = [
  KnownChainIds.EthereumMainnet,
  KnownChainIds.ArbitrumMainnet,
  KnownChainIds.BitcoinMainnet,
  KnownChainIds.SolanaMainnet,
] as const

export type ChainflipSupportedChainId = (typeof ChainflipSupportedChainIds)[number]

export const ChainflipSupportedAssetIdsByChainId: Partial<Record<KnownChainIds, AssetId[]>> = {
  [KnownChainIds.EthereumMainnet]: [ethAssetId, flipAssetId, usdcAssetId, usdtAssetId],
  [KnownChainIds.ArbitrumMainnet]: [arbitrumAssetId, usdcOnArbitrumOneAssetId],
  [KnownChainIds.BitcoinMainnet]: [btcAssetId],
  [KnownChainIds.SolanaMainnet]: [solAssetId, usdcOnSolanaAssetId],
}

export const chainIdToChainflipNetwork: Partial<Record<ChainId, string>> = {
  [KnownChainIds.EthereumMainnet]: 'eth',
  [KnownChainIds.ArbitrumMainnet]: 'arb',
  [KnownChainIds.BitcoinMainnet]: 'btc',
  [KnownChainIds.SolanaMainnet]: 'sol',
}

export const CHAINFLIP_SUPPORTED_CHAIN_IDS: SupportedChainIds = {
  sell: ChainflipSupportedChainIds as unknown as ChainId[],
  buy: ChainflipSupportedChainIds as unknown as ChainId[],
}

export const CHAINFLIP_SWAP_SOURCE: SwapSource = SwapperName.Chainflip
export const CHAINFLIP_BOOST_SWAP_SOURCE: SwapSource = `${SwapperName.Chainflip} • Boost`
export const CHAINFLIP_DCA_SWAP_SOURCE: SwapSource = `${SwapperName.Chainflip} • DCA`
export const CHAINFLIP_DCA_BOOST_SWAP_SOURCE: SwapSource = `${SwapperName.Chainflip} • DCA • Boost`

export const usdcAsset: Asset = {
  assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  chainId: KnownChainIds.EthereumMainnet,
  color: '#2373CB',
  explorer: 'https://etherscan.io',
  explorerAddressLink: 'https://etherscan.io/address/',
  explorerTxLink: 'https://etherscan.io/tx/',
  icon: 'https://rawcdn.githack.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
  name: 'USDC on Ethereum',
  precision: 6,
  relatedAssetKey: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  symbol: 'USDC',
}
