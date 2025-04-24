import { RelayStatusMessage } from '../constant'
import type { RelayStatus } from './types'

export const getLatestRelayStatusMessage = (status: RelayStatus): string => {
  const { status: statusValue, details } = status

  switch (true) {
    case statusValue === 'waiting':
      return RelayStatusMessage.WaitingForDeposit
    case statusValue === 'pending' && details.includes('Could not fill request'):
    case statusValue === 'delayed':
      return RelayStatusMessage.Retrying
    case statusValue === 'pending' &&
      (details.includes('Generating solution') || details.includes('Filling solution')):
      return RelayStatusMessage.DepositDetected
    case statusValue === 'success':
      return RelayStatusMessage.SwapComplete
    case statusValue === 'failed':
      return RelayStatusMessage.SwapFailed
    default:
      return 'Unknown status'
  }
}
