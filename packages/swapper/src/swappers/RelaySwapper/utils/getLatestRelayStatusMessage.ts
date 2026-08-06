import { RelayStatusMessage } from '../constant'
import type { RelayStatus } from './types'

export const getLatestRelayStatusMessage = (status: RelayStatus): string => {
  const { status: statusValue } = status

  switch (true) {
    case statusValue === 'waiting':
      return RelayStatusMessage.WaitingForDeposit
    case statusValue === 'delayed':
      return RelayStatusMessage.Retrying
    case statusValue === 'pending':
    case statusValue === 'depositing':
    case statusValue === 'submitted':
      return RelayStatusMessage.DepositDetected
    case statusValue === 'success':
      return RelayStatusMessage.SwapComplete
    case statusValue === 'failure':
      return RelayStatusMessage.SwapFailed
    default:
      return 'Unknown status'
  }
}
