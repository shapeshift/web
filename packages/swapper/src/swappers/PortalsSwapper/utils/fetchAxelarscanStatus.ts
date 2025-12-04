import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { SwapErrorRight } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'

type AxelarscanGMPData = {
  status: string
  simplified_status?: string
  call?: {
    transaction_hash?: string
  }
  executed?: {
    transaction_hash?: string
  }
  express_executed?: {
    transactionHash?: string
  }
  error?: {
    message?: string
  }
}

type AxelarscanResponse = {
  data: AxelarscanGMPData[]
  total: number
}

export type AxelarscanBridgeStatus = {
  status: 'pending' | 'confirmed' | 'failed'
  destinationTxHash?: string
  errorMessage?: string
}

export const fetchAxelarscanBridgeStatus = async (
  sourceTxHash: string,
): Promise<Result<AxelarscanBridgeStatus | undefined, SwapErrorRight>> => {
  try {
    const response = await fetch(`https://api.axelarscan.io/gmp/searchGMP?txHash=${sourceTxHash}`)

    if (!response.ok) {
      return Err(
        makeSwapErrorRight({
          message: `Axelarscan API error: ${response.statusText}`,
        }),
      )
    }

    const data: AxelarscanResponse = await response.json()

    if (!data.data || data.data.length === 0) {
      return Ok(undefined)
    }

    const bridgeData = data.data[0]

    const destinationTxHash =
      bridgeData.call?.transaction_hash ||
      bridgeData.executed?.transaction_hash ||
      bridgeData.express_executed?.transactionHash

    const isCompleted =
      bridgeData.status === 'executed' ||
      bridgeData.status === 'destination_executed' ||
      bridgeData.status === 'express_executed' ||
      bridgeData.simplified_status === 'received' ||
      !!destinationTxHash

    if (isCompleted) {
      return Ok({
        status: 'confirmed' as const,
        destinationTxHash,
      })
    }

    if (bridgeData.status === 'error') {
      return Ok({
        status: 'failed' as const,
        errorMessage: bridgeData.error?.message || 'Bridge failed',
      })
    }

    return Ok({
      status: 'pending' as const,
    })
  } catch (error) {
    return Err(
      makeSwapErrorRight({
        message: 'Failed to fetch Axelarscan bridge status',
        cause: error,
      }),
    )
  }
}

export const getAxelarscanTrackingLink = (sourceTxHash: string): string =>
  `https://axelarscan.io/gmp/${sourceTxHash}`
