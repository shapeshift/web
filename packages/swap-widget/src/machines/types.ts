import type { Asset, QuoteResponse, TradeRate } from '../types'

export type ErrorSource = 'QUOTE_ERROR' | 'APPROVAL_ERROR' | 'EXECUTE_ERROR' | 'STATUS_FAILED'

export type SwapMachineContext = {
  sellAsset: Asset
  buyAsset: Asset
  sellAmount: string
  sellAmountBaseUnit: string | undefined
  // Set only in exact-output mode, where it drives quoting and the sell amount comes back derived
  buyAmount: string
  buyAmountBaseUnit: string | undefined
  isSellAmountFiat: boolean
  sellAmountFiat: string
  selectedRate: TradeRate | null
  quote: QuoteResponse | null
  txHash: string | null
  approvalTxHash: string | null
  error: string | null
  errorSource: ErrorSource | null
  retryCount: number
  chainType: 'evm' | 'utxo' | 'solana' | 'cosmos' | 'other'
  isDepositFlow: boolean
  slippage: string
  // Named for the api field it fills - on a deposit swap it's the typed refund address
  sendAddress: string | undefined
  receiveAddress: string | undefined
  isSellAssetEvm: boolean
  isSellAssetUtxo: boolean
  isSellAssetSolana: boolean
  isBuyAssetEvm: boolean
}

export type SwapMachineEvent =
  | { type: 'SET_SELL_ASSET'; asset: Asset }
  | { type: 'SET_BUY_ASSET'; asset: Asset }
  | {
      type: 'SET_SELL_AMOUNT'
      amount: string
      amountBaseUnit: string | undefined
      fiatValue: string
    }
  | { type: 'SET_BUY_AMOUNT'; amount: string; amountBaseUnit: string | undefined }
  | { type: 'SET_SELL_FIAT_MODE'; isFiat: boolean }
  | { type: 'SET_SLIPPAGE'; slippage: string }
  | { type: 'SELECT_RATE'; rate: TradeRate }
  | { type: 'FETCH_QUOTE'; isDepositFlow?: boolean }
  | { type: 'DEPOSIT_DETECTED'; txHash: string }
  | { type: 'DEPOSIT_EXPIRED' }
  | {
      type: 'RESTORE_DEPOSIT'
      quote: QuoteResponse
      sendAddress: string
      receiveAddress: string
      sellAmountBaseUnit: string | undefined
      buyAmountBaseUnit: string | undefined
      txHash: string | undefined
    }
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
  | { type: 'SET_SEND_ADDRESS'; address: string | undefined }
  | { type: 'SET_RECEIVE_ADDRESS'; address: string | undefined }
  | {
      type: 'UPDATE_CHAIN_INFO'
      chainType: SwapMachineContext['chainType']
      isSellAssetEvm: boolean
      isSellAssetUtxo: boolean
      isSellAssetSolana: boolean
      isBuyAssetEvm: boolean
    }
