import type { ChainId } from '@shapeshiftoss/caip'
import {
  avalancheChainId,
  bchChainId,
  binanceChainId,
  btcChainId,
  cosmosChainId,
  dogeChainId,
  ethChainId,
  ltcChainId,
  thorchainChainId,
} from '@shapeshiftoss/caip'

export enum ThorchainChain {
  BTC = 'BTC',
  DOGE = 'DOGE',
  LTC = 'LTC',
  BCH = 'BCH',
  ETH = 'ETH',
  AVAX = 'AVAX',
  BNB = 'BNB',
  GAIA = 'GAIA',
  RUNE = 'RUNE',
  THOR = 'THOR',
}

export const ChainToChainIdMap: Map<ThorchainChain, ChainId> = new Map([
  [ThorchainChain.BTC, btcChainId],
  [ThorchainChain.DOGE, dogeChainId],
  [ThorchainChain.LTC, ltcChainId],
  [ThorchainChain.BCH, bchChainId],
  [ThorchainChain.ETH, ethChainId],
  [ThorchainChain.AVAX, avalancheChainId],
  [ThorchainChain.BNB, binanceChainId],
  [ThorchainChain.GAIA, cosmosChainId],
  [ThorchainChain.RUNE, thorchainChainId],
  [ThorchainChain.THOR, thorchainChainId],
])
