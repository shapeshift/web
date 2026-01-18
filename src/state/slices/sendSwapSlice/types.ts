export enum QuoteStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  DEPOSIT_RECEIVED = 'DEPOSIT_RECEIVED',
  EXECUTING = 'EXECUTING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export type StatusHistoryEntry = {
  step: string
  status: string | null
  timestamp: string
}

export type SendSwapProgress = {
  quoteId: string
  status: QuoteStatus
  currentStep: string | null
  statusHistory: StatusHistoryEntry[]
  depositTxHash: string | null
  executionTxHash: string | null
  executedAt: Date | null
  createdAt: Date
  updatedAt: Date
  expiresAt: Date
  isExpired: boolean
}
