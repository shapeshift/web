import { QuoteRequest } from '@defuse-protocol/one-click-sdk-typescript'

// 1Click API base URL
export const ONE_CLICK_BASE_URL = 'https://1click.chaindefuser.com'

// Default slippage: 0.5% = 50 basis points
export const DEFAULT_SLIPPAGE_BPS = 50

// Swap type - EXACT_INPUT matches ShapeShift's UX
// User specifies exact sell amount, receives estimated buy amount with slippage protection
export const DEFAULT_SWAP_TYPE = QuoteRequest.swapType.EXACT_INPUT

// Quote deadline: 30 minutes from request time
export const DEFAULT_QUOTE_DEADLINE_MS = 30 * 60 * 1000

// Deposit type: ORIGIN_CHAIN means user deposits from their origin chain wallet
export const DEFAULT_DEPOSIT_TYPE = QuoteRequest.depositType.ORIGIN_CHAIN

// Recipient type: DESTINATION_CHAIN means user receives on destination chain
export const DEFAULT_RECIPIENT_TYPE = QuoteRequest.recipientType.DESTINATION_CHAIN

// Refund type: ORIGIN_CHAIN means refunds go back to origin chain
export const DEFAULT_REFUND_TYPE = QuoteRequest.refundType.ORIGIN_CHAIN
