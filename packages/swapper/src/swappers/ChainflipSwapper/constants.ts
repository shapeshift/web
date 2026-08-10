import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import {
  arbitrumAssetId,
  btcAssetId,
  ethAssetId,
  flipAssetId,
  solAssetId,
  tronAssetId,
  usdcAssetId,
  usdcOnArbitrumOneAssetId,
  usdcOnSolanaAssetId,
  usdtAssetId,
  usdtOnArbitrumOneAssetId,
  usdtOnSolanaAssetId,
  usdtOnTronAssetId,
  wbtcAssetId,
} from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'

import type { SwapSource } from '../../types'
import { SwapperName } from '../../types'
import { ChainflipNetwork } from './types'

export const CHAINFLIP_REGULAR_QUOTE = 'regular' as const
export const CHAINFLIP_DCA_QUOTE = 'dca' as const

// Deposit channels stay open ~24h - 6h keeps a 4x margin against depositing to an expired channel
export const CHAINFLIP_CHANNEL_DEADLINE_MS = 6 * 60 * 60 * 1000

export const ChainflipSupportedChainIds = [
  KnownChainIds.EthereumMainnet,
  KnownChainIds.ArbitrumMainnet,
  KnownChainIds.BitcoinMainnet,
  KnownChainIds.SolanaMainnet,
  KnownChainIds.TronMainnet,
] as const

export type ChainflipSupportedChainId = (typeof ChainflipSupportedChainIds)[number]

export const ChainflipSupportedAssetIdsByChainId: Partial<Record<KnownChainIds, AssetId[]>> = {
  [KnownChainIds.EthereumMainnet]: [ethAssetId, flipAssetId, usdcAssetId, usdtAssetId, wbtcAssetId],
  [KnownChainIds.ArbitrumMainnet]: [
    arbitrumAssetId,
    usdcOnArbitrumOneAssetId,
    usdtOnArbitrumOneAssetId,
  ],
  [KnownChainIds.BitcoinMainnet]: [btcAssetId],
  [KnownChainIds.SolanaMainnet]: [solAssetId, usdcOnSolanaAssetId, usdtOnSolanaAssetId],
  [KnownChainIds.TronMainnet]: [tronAssetId, usdtOnTronAssetId],
}

export const chainIdToChainflipNetwork: Partial<Record<ChainId, ChainflipNetwork>> = {
  [KnownChainIds.EthereumMainnet]: ChainflipNetwork.Ethereum,
  [KnownChainIds.ArbitrumMainnet]: ChainflipNetwork.Arbitrum,
  [KnownChainIds.BitcoinMainnet]: ChainflipNetwork.Bitcoin,
  [KnownChainIds.SolanaMainnet]: ChainflipNetwork.Solana,
  [KnownChainIds.TronMainnet]: ChainflipNetwork.Tron,
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
  name: 'USDC',
  precision: 6,
  relatedAssetKey: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  symbol: 'USDC',
}

export enum ChainflipStatusMessage {
  WaitingForDeposit = 'Waiting for deposit...',
  DepositDetected = 'Deposit detected, waiting for confirmation...',
  ProcessingSwap = 'Processing swap...',
  OutboundTransactionInitiated = 'Outbound transaction initiated...',
  PreparingOutboundTransaction = 'Preparing outbound transaction...',
  TransactionSent = 'Transaction sent, waiting for confirmation...',
  SwapComplete = 'Swap complete',
  SwapFailed = 'Swap failed',
}
