import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { SwapErrorRight } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'

type RelayRequest = {
  status?: string
  data?: {
    failReason?: string
    outTxs?: { hash?: string; chainId?: number }[]
  }
}

type RelayRequestsResponse = {
  requests?: RelayRequest[]
}

export type RelayBridgeStatus = {
  status: 'pending' | 'confirmed' | 'failed'
  destinationTxHash?: string
  errorMessage?: string
}

// Portals route most cross-chain orders through Relay, which indexes them by their origin tx hash
export const fetchRelayBridgeStatus = async (
  sourceTxHash: string,
): Promise<Result<RelayBridgeStatus | undefined, SwapErrorRight>> => {
  try {
    const response = await fetch(`https://api.relay.link/requests/v2?hash=${sourceTxHash}`)

    if (!response.ok) {
      return Err(
        makeSwapErrorRight({
          message: `Relay API error: ${response.statusText}`,
        }),
      )
    }

    const data: RelayRequestsResponse = await response.json()

    const request = data.requests?.[0]

    if (!request) return Ok(undefined)

    const destinationTxHash = request.data?.outTxs?.[0]?.hash

    switch (request.status) {
      case 'success':
        return Ok({ status: 'confirmed' as const, destinationTxHash })
      case 'failure':
      case 'refund':
        return Ok({
          status: 'failed' as const,
          errorMessage:
            request.data?.failReason && request.data.failReason !== 'N/A'
              ? request.data.failReason
              : 'Bridge failed',
        })
      default:
        return Ok({ status: 'pending' as const })
    }
  } catch (error) {
    return Err(
      makeSwapErrorRight({
        message: 'Failed to fetch Relay bridge status',
        cause: error,
      }),
    )
  }
}

export const getRelayTrackingLink = (sourceTxHash: string): string =>
  `https://relay.link/transaction/${sourceTxHash}`
