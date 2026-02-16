import type { Asset, QuoteResponse, TradeRate } from '../types'

export type ErrorSource = 'QUOTE_ERROR' | 'APPROVAL_ERROR' | 'EXECUTE_ERROR' | 'STATUS_FAILED'

export type SwapMachineContext = {
  sellAsset: Asset
  buyAsset: Asset
  sellAmount: string
  sellAmountBaseUnit: string | undefined
  selectedRate: TradeRate | null
  quote: QuoteResponse | null
  txHash: string | null
  approvalTxHash: string | null
  error: string | null
  errorSource: ErrorSource | null
  retryCount: number
  chainType: 'evm' | 'utxo' | 'solana' | 'cosmos' | 'other'
  slippage: string
  walletAddress: string | undefined
  effectiveReceiveAddress: string
  isSellAssetEvm: boolean
  isSellAssetUtxo: boolean
  isSellAssetSolana: boolean
  isBuyAssetEvm: boolean
}

export type SwapMachineEvent =
  | { type: 'SET_SELL_ASSET'; asset: Asset }
  | { type: 'SET_BUY_ASSET'; asset: Asset }
  | { type: 'SET_SELL_AMOUNT'; amount: string; amountBaseUnit: string | undefined }
  | { type: 'SET_SLIPPAGE'; slippage: string }
  | { type: 'SELECT_RATE'; rate: TradeRate }
  | { type: 'FETCH_QUOTE' }
  | { type: 'QUOTE_SUCCESS'; quote: QuoteResponse }
  | { type: 'QUOTE_ERROR'; error: string }
  | { type: 'APPROVE' }
  | { type: 'APPROVAL_SUCCESS'; txHash: string }
  | { type: 'APPROVAL_ERROR'; error: string }
  | { type: 'EXECUTE_SUCCESS'; txHash: string }
  | { type: 'EXECUTE_ERROR'; error: string }
  | { type: 'STATUS_CONFIRMED' }
  | { type: 'STATUS_FAILED'; error: string }
  | { type: 'RETRY' }
  | { type: 'RESET' }
  | { type: 'SET_WALLET_ADDRESS'; address: string | undefined }
  | { type: 'SET_RECEIVE_ADDRESS'; address: string }
  | {
      type: 'UPDATE_CHAIN_INFO'
      chainType: SwapMachineContext['chainType']
      isSellAssetEvm: boolean
      isSellAssetUtxo: boolean
      isSellAssetSolana: boolean
      isBuyAssetEvm: boolean
    }
