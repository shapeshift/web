import type { ChainflipBaasStatusEgress } from './models/ChainflipBaasStatusEgress'
import type { ChainflipBaasStatusSwap } from './models/ChainflipBaasStatusSwap'

export type ChainflipMetadata = {
  name: 'chainflip'
  chainflipSwapId: number | string
}

// Non-exhaustive
export type ChainFlipStatus = {
  status: {
    state: 'waiting' | 'receiving' | 'swapping' | 'sending' | 'sent' | 'completed' | 'failed'
    swapId?: string
    swap?: ChainflipBaasStatusSwap
    swapEgress?: ChainflipBaasStatusEgress
  }
}

export enum ChainflipNetwork {
  Bitcoin = 'Bitcoin',
  Ethereum = 'Ethereum',
  Arbitrum = 'Arbitrum',
  Solana = 'Solana',
  Tron = 'Tron',
}
