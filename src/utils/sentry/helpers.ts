import { captureException as sentryCaptureException } from '@sentry/react'
import { ChainAdapterError } from '@shapeshiftoss/chain-adapters'
import { TradeQuoteError } from '@shapeshiftoss/swapper'

/**
 * Checks if an error is an expected business logic or user-facing error
 * that should not be captured by Sentry
 */
export const isExpectedError = (error: unknown): boolean => {
  if (!error) return false

  const errorMessage = error instanceof Error ? error.message : String(error)

  // Check if it's a known business error type
  if (error instanceof ChainAdapterError) {
    // Chain adapter errors are usually user-facing
    return true
  }

  // Check for trade quote errors using the enum
  const tradeQuoteErrors = [
    TradeQuoteError.UnsupportedTradePair,
    TradeQuoteError.NoRouteFound,
    TradeQuoteError.RateLimitExceeded,
    TradeQuoteError.SellAmountBelowMinimum,
    TradeQuoteError.TradingHalted,
  ]

  if (tradeQuoteErrors.some(errorType => errorMessage.includes(errorType))) {
    return true
  }

  // Check for user-initiated cancellations
  const userCancellationPatterns = ['User rejected', 'User denied', 'transactionRejected']

  return userCancellationPatterns.some(pattern => errorMessage.includes(pattern))
}

/**
 * Determines whether an error should be captured by Sentry
 */
export const shouldCaptureError = (error: unknown): boolean => {
  // Don't capture expected errors
  if (isExpectedError(error)) {
    return false
  }

  // Don't capture network connectivity errors
  const errorMessage = error instanceof Error ? error.message : String(error)
  const networkErrorPatterns = [
    'NetworkError',
    'Failed to fetch',
    'Network request failed',
    'Load failed',
    'timeout',
  ]

  const isNetworkError = networkErrorPatterns.some(pattern =>
    errorMessage.toLowerCase().includes(pattern.toLowerCase()),
  )

  if (isNetworkError) {
    return false
  }

  // Capture everything else
  return true
}

/**
 * Captures an exception with additional context
 * Only captures if the error should be captured according to our rules
 */
export const captureExceptionWithContext = (
  error: unknown,
  context?: {
    tags?: Record<string, string>
    extra?: Record<string, unknown>
    level?: 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug'
    fingerprint?: string[]
  },
): void => {
  // Check if we should capture this error
  if (!shouldCaptureError(error)) {
    // Log to console but don't send to Sentry
    console.error('Expected error (not sent to Sentry):', error)
    return
  }

  // Capture with context
  sentryCaptureException(error, {
    tags: context?.tags,
    extra: context?.extra,
    level: context?.level,
    fingerprint: context?.fingerprint,
  })
}
