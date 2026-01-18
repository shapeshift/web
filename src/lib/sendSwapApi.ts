import type { QuoteStatus } from '@/state/slices/sendSwapSlice/types'

const SEND_SWAP_API_BASE = process.env.REACT_APP_SEND_SWAP_API_URL || 'http://localhost:3004'

export type SendSwapQuoteStatus = {
  quoteId: string
  status: QuoteStatus
  currentStep: string | null
  statusHistory: Array<{
    step: string
    status: string | null
    timestamp: string
  }>
  depositTxHash: string | null
  executionTxHash: string | null
  executedAt: Date | null
  createdAt: Date
  updatedAt: Date
  expiresAt: Date
  isExpired: boolean
}

export const sendSwapApi = {
  /**
   * Get the current status of a send-swap quote
   * @param quoteId - The quote ID to check status for
   * @returns Current status including progress steps
   */
  async getQuoteStatus(quoteId: string): Promise<SendSwapQuoteStatus> {
    const response = await fetch(`${SEND_SWAP_API_BASE}/quotes/${quoteId}/status`)

    if (!response.ok) {
      throw new Error(`Failed to fetch quote status: ${response.statusText}`)
    }

    return response.json()
  },

  /**
   * Get a quote by ID
   * @param quoteId - The quote ID
   * @returns The full quote details
   */
  async getQuote(quoteId: string): Promise<unknown> {
    const response = await fetch(`${SEND_SWAP_API_BASE}/quotes/${quoteId}`)

    if (!response.ok) {
      throw new Error(`Failed to fetch quote: ${response.statusText}`)
    }

    return response.json()
  },
}
