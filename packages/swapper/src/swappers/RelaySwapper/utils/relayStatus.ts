import { TxStatus } from '@shapeshiftoss/unchained-client'
import type { Result } from '@sniptt/monads'

import type { SwapErrorRight, SwapperConfig } from '../../../types'
import { getRelayRequestConfig, relayService } from './relayService'
import type { RelayRequest, RelayStatus } from './types'

export const getRelayTrackingLink = (txHash: string): string =>
  `https://relay.link/transaction/${txHash}`

export const relayStatusToTxStatus = (status: RelayStatus['status'] | undefined): TxStatus => {
  switch (status) {
    case 'success':
      return TxStatus.Confirmed
    case 'waiting':
    case 'delayed':
    case 'pending':
    case 'depositing':
    case 'submitted':
      return TxStatus.Pending
    case 'failure':
    case 'refund':
      return TxStatus.Failed
    default:
      return TxStatus.Unknown
  }
}

// Relay index requests by origin tx hash, resolving a swap we hold no relayId for
export const fetchRelayRequestByTxHash = async (
  txHash: string,
  config: SwapperConfig,
): Promise<Result<RelayRequest | undefined, SwapErrorRight>> => {
  const maybeResponse = await relayService.get<{ requests?: RelayRequest[] }>(
    `${config.VITE_RELAY_API_URL}/requests/v2?hash=${txHash}`,
    getRelayRequestConfig(config),
  )

  // Match the origin tx ourselves rather than trusting the listing to have filtered on it
  return maybeResponse.map(({ data }) =>
    data.requests?.find(({ data: request }) =>
      request?.inTxs?.some(({ hash }) => hash?.toLowerCase() === txHash.toLowerCase()),
    ),
  )
}

export const getRelayRequestFailureMessage = (request: RelayRequest): string => {
  const { failReason, refundFailReason } = request.data ?? {}

  // Relay report 'N/A' rather than omitting the reason when there isn't one
  const reason = [failReason, refundFailReason].find(value => value && value !== 'N/A')

  return reason ?? 'Bridge failed'
}
