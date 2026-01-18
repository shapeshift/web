import { Alert, AlertDescription, AlertIcon, Box, Spinner, Text } from '@chakra-ui/react'

import { SendSwapProgress } from '../MultiHopTrade/components/TradeConfirm/components/SendSwapProgress'
import { useSendSwapStatus } from '../MultiHopTrade/components/TradeConfirm/hooks/useSendSwapStatus'

export type SendSwapStatusProps = {
  quoteId: string
  enabled?: boolean
}

/**
 * Component to display real-time status of a send-swap quote.
 * Automatically polls the backend for updates and displays progress steps.
 *
 * @example
 * ```tsx
 * <SendSwapStatus quoteId="quote_abc123" />
 * ```
 */
export const SendSwapStatus = ({ quoteId, enabled = true }: SendSwapStatusProps) => {
  const { status, isLoading, error, isComplete, isFailed, isExpired } = useSendSwapStatus({
    quoteId,
    enabled,
  })

  if (error) {
    return (
      <Alert status='error'>
        <AlertIcon />
        <AlertDescription>Failed to load swap status: {error.message}</AlertDescription>
      </Alert>
    )
  }

  if (isLoading && !status) {
    return (
      <Box textAlign='center' py={8}>
        <Spinner size='lg' />
        <Text mt={4}>Loading swap status...</Text>
      </Box>
    )
  }

  if (!status) {
    return (
      <Alert status='warning'>
        <AlertIcon />
        <AlertDescription>No status available for quote: {quoteId}</AlertDescription>
      </Alert>
    )
  }

  return (
    <Box>
      <Text fontSize='lg' fontWeight='bold' mb={4}>
        Send Swap Progress
      </Text>
      <Text fontSize='sm' color='gray.500' mb={4}>
        Quote ID: {quoteId}
      </Text>

      <SendSwapProgress status={status} />

      {isComplete && (
        <Alert status='success' mt={4}>
          <AlertIcon />
          <AlertDescription>Swap completed successfully!</AlertDescription>
        </Alert>
      )}

      {isFailed && (
        <Alert status='error' mt={4}>
          <AlertIcon />
          <AlertDescription>Swap failed. Please contact support.</AlertDescription>
        </Alert>
      )}

      {isExpired && !isFailed && !isComplete && (
        <Alert status='warning' mt={4}>
          <AlertIcon />
          <AlertDescription>
            Quote has expired. Please create a new quote to try again.
          </AlertDescription>
        </Alert>
      )}
    </Box>
  )
}
