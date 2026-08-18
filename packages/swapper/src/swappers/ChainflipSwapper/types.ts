import type {
  GetEvmTradeQuoteInput,
  GetEvmTradeRateInput,
  GetSolanaTradeQuoteInput,
  GetSolanaTradeRateInput,
  GetTronTradeQuoteInput,
  GetTronTradeRateInput,
  GetUtxoTradeQuoteInput,
  GetUtxoTradeRateInput,
} from '../../types'
import type { ChainflipBaasStatusEgress } from './models/ChainflipBaasStatusEgress'
import type { ChainflipBaasStatusSwap } from './models/ChainflipBaasStatusSwap'

export type ChainflipTradeQuoteInput =
  | GetEvmTradeQuoteInput
  | GetUtxoTradeQuoteInput
  | GetSolanaTradeQuoteInput
  | GetTronTradeQuoteInput

export type ChainflipTradeRateInput =
  | GetEvmTradeRateInput
  | GetUtxoTradeRateInput
  | GetSolanaTradeRateInput
  | GetTronTradeRateInput

export type ChainflipMetadata = {
  name: 'chainflip'
  swapId: number | string
}

// Non-exhaustive
export type ChainFlipStatus = {
  status: {
    state: 'waiting' | 'receiving' | 'swapping' | 'sending' | 'sent' | 'completed' | 'failed'
    swapId?: string
    deposit?: { transactionReference?: string | null }
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
