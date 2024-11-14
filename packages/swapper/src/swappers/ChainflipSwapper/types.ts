import type { ChainflipBaasStatusEgress } from './models/ChainflipBaasStatusEgress'

// Non-exhaustive
export type ChainFlipStatus = {
  status: {
    // TODO(gomes): Status polling a la THOR
    state: 'waiting' | 'receiving' | 'swapping' | 'sending' | 'sent' | 'completed' | 'failed'
    swapEgress?: ChainflipBaasStatusEgress
  }
}

export enum ChainflipNetwork {
  Bitcoin = 'Bitcoin',
  Ethereum = 'Ethereum',
  Arbitrum = 'Arbitrum',
  Solana = 'Solana',
}
