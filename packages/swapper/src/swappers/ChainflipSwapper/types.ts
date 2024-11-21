import type { ChainflipBaasStatusEgress } from './models/ChainflipBaasStatusEgress'
import type { ChainflipBaasStatusSwap } from './models/ChainflipBaasStatusSwap'

// Non-exhaustive
export type ChainFlipStatus = {
  status: {
    state: 'waiting' | 'receiving' | 'swapping' | 'sending' | 'sent' | 'completed' | 'failed'
    swap?: ChainflipBaasStatusSwap
    swapEgress?: ChainflipBaasStatusEgress
  }
}

export enum ChainflipNetwork {
  Bitcoin = 'Bitcoin',
  Ethereum = 'Ethereum',
  Arbitrum = 'Arbitrum',
  Solana = 'Solana',
}
