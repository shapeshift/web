import type { ChainId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { SwapErrorRight } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'

type SquidRouteStatus = {
  chainId: string
  txHash: string
  status: string
  action: string
}

type SquidStatusResponse = {
  id: string
  status: string
  squidTransactionStatus: string
  isGMPTransaction: boolean
  fromChain: {
    transactionId: string
    blockNumber: string
  }
  toChain: {
    transactionId: string
    blockNumber: string
  }
  routeStatus: SquidRouteStatus[]
}

export type SquidBridgeStatus = {
  status: 'pending' | 'confirmed' | 'failed'
  destinationTxHash?: string
}

const chainIdToSquidChainId = (chainId: ChainId): string => {
  return chainId.replace('eip155:', '')
}

export const fetchSquidBridgeStatus = async (
  sourceTxHash: string,
  fromChainId: ChainId,
  toChainId: ChainId,
): Promise<Result<SquidBridgeStatus, SwapErrorRight>> => {
  try {
    const fromChain = chainIdToSquidChainId(fromChainId)
    const toChain = chainIdToSquidChainId(toChainId)

    const url = new URL('https://v2.api.squidrouter.com/v2/status')
    url.searchParams.set('transactionId', sourceTxHash)
    url.searchParams.set('fromChainId', fromChain)
    url.searchParams.set('toChainId', toChain)

    const response = await fetch(url.toString(), {
      headers: {
        'x-integrator-id': 'squid-swap-widget',
      },
    })

    if (!response.ok) {
      return Err(
        makeSwapErrorRight({
          message: `Squid API error: ${response.statusText}`,
        }),
      )
    }

    const data: SquidStatusResponse = await response.json()

    const destinationTxHash = data.toChain?.transactionId

    if (data.squidTransactionStatus === 'success') {
      return Ok({
        status: 'confirmed' as const,
        destinationTxHash,
      })
    }

    if (
      data.squidTransactionStatus === 'partial_success' ||
      data.squidTransactionStatus === 'needs_gas'
    ) {
      return Ok({
        status: 'failed' as const,
      })
    }

    return Ok({
      status: 'pending' as const,
    })
  } catch (error) {
    return Err(
      makeSwapErrorRight({
        message: 'Failed to fetch Squid bridge status',
        cause: error,
      }),
    )
  }
}

export const getSquidTrackingLink = (
  sourceTxHash: string,
  fromChainId: ChainId,
  toChainId: ChainId,
): string => {
  const fromChain = chainIdToSquidChainId(fromChainId)
  const toChain = chainIdToSquidChainId(toChainId)
  return `https://v2.api.squidrouter.com/v2/status?transactionId=${sourceTxHash}&fromChainId=${fromChain}&toChainId=${toChain}`
}
