import type { AxiosError } from 'axios'
import axios from 'axios'
import type { Address } from 'viem'

import type { SwapperConfig } from '../../../types'

// non-exhaustive
type PortalsTradeOrderParams = {
  sender: string
  inputToken: string
  inputAmount: string
  outputToken: string
  // Technically optional, but we always want to use an affiliate addy
  partner: string
  feePercentage?: number
  // Technically optional, but we want to explicitly specify validate
  validate: boolean
  swapperConfig: SwapperConfig
} & (
  | {
      slippageTolerancePercentage: number
      autoSlippage?: never
    }
  | {
      slippageTolerancePercentage?: never
      autoSlippage: true
    }
)

type PortalsTradeOrderEstimateParams = Omit<
  PortalsTradeOrderParams,
  'partner' | 'validate' | 'sender'
>

type PortalsTradeOrderResponse = {
  context: {
    orderId: string
    inputToken: string
    inputAmount: string
    inputAmountUsd: number
    outputToken: string
    outputAmount: string
    outputAmountUsd: number
    minOutputAmount: string
    minOutputAmountUsd: number
    slippageTolerancePercentage: number
    target: string
    partner: string
    sender: string
    recipient: string
    value: string
    route: string[]
    routeHash: string
    steps: string[]
    gasLimit?: string
    feeToken?: string
    feeAmount?: string
    feeAmountUsd?: number
  }
  tx?: {
    to: Address
    from: Address
    data: string
    value: string
    gasLimit: string
  }
}

type PortalsTradeOrderEstimateResponse = {
  outputAmount: string
  minOutputAmount: string
  outputToken: string
  outputTokenDecimals: number
  context: {
    slippageTolerancePercentage: number
    inputAmount: string
    inputAmountUsd: number
    inputToken: string
    outputToken: string
    outputAmount: string
    outputAmountUsd: number
    minOutputAmountUsd: number
    gasLimit: number
    sender?: string
  }
}

export class PortalsError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PortalsError'
  }
}

export const fetchPortalsTradeOrder = async ({
  sender,
  inputToken,
  inputAmount,
  outputToken,
  slippageTolerancePercentage,
  autoSlippage,
  partner,
  feePercentage,
  validate,
  swapperConfig,
}: PortalsTradeOrderParams): Promise<PortalsTradeOrderResponse> => {
  const url = `${swapperConfig.VITE_PORTALS_BASE_URL}/v2/portal`

  const params = new URLSearchParams({
    partner,
    ...(sender ? { sender } : {}),
    inputToken,
    inputAmount,
    outputToken,
    validate: validate.toString(),
  })

  if (!autoSlippage) {
    params.append('slippageTolerancePercentage', slippageTolerancePercentage.toFixed(2)) // Portals API expects a string with at most 2 decimal places
  }

  if (feePercentage) {
    params.append('feePercentage', feePercentage.toString())
  }

  try {
    const response = await axios.get<PortalsTradeOrderResponse>(url, { params })

    console.log('[Portals Quote] Order response:', {
      endpoint: '/v2/portal',
      request: {
        sender,
        partner,
        inputToken,
        inputAmount,
        outputToken,
        slippageTolerancePercentage: !autoSlippage ? slippageTolerancePercentage : 'auto',
        feePercentage,
        validate,
      },
      response: {
        orderId: response.data.context.orderId,
        outputAmount: response.data.context.outputAmount,
        minOutputAmount: response.data.context.minOutputAmount,
        outputAmountUsd: response.data.context.outputAmountUsd,
        minOutputAmountUsd: response.data.context.minOutputAmountUsd,
        slippage: response.data.context.slippageTolerancePercentage,
        feeAmount: response.data.context.feeAmount,
        feeToken: response.data.context.feeToken,
        feeAmountUsd: response.data.context.feeAmountUsd,
        gasLimit: response.data.context.gasLimit,
        route: response.data.context.route,
        routeHash: response.data.context.routeHash,
        steps: response.data.context.steps,
      },
      fullResponse: response.data,
      timestamp: new Date().toISOString(),
    })

    return response.data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = (error as AxiosError<{ message: string }>).response?.data?.message

      if (message) {
        throw new PortalsError(message)
      }

      throw new Error(`Failed to fetch Portals trade order: ${error.message}`)
    }

    throw error
  }
}

export const fetchPortalsTradeEstimate = async ({
  inputToken,
  inputAmount,
  outputToken,
  slippageTolerancePercentage,
  swapperConfig,
}: PortalsTradeOrderEstimateParams): Promise<PortalsTradeOrderEstimateResponse> => {
  const url = `${swapperConfig.VITE_PORTALS_BASE_URL}/v2/portal/estimate`

  const params = new URLSearchParams({
    inputToken,
    inputAmount,
    outputToken,
  })

  if (slippageTolerancePercentage !== undefined) {
    params.append('slippageTolerancePercentage', slippageTolerancePercentage.toFixed(2)) // Portals API expects a string with at most 2 decimal places
  }

  try {
    const response = await axios.get<PortalsTradeOrderEstimateResponse>(url, { params })

    console.log('[Portals Rate] Estimate response:', {
      endpoint: '/v2/portal/estimate',
      request: {
        inputToken,
        inputAmount,
        outputToken,
        slippageTolerancePercentage,
      },
      response: {
        outputAmount: response.data.outputAmount,
        minOutputAmount: response.data.minOutputAmount,
        outputAmountUsd: response.data.context.outputAmountUsd,
        minOutputAmountUsd: response.data.context.minOutputAmountUsd,
        slippage: response.data.context.slippageTolerancePercentage,
        gasLimit: response.data.context.gasLimit,
      },
      fullResponse: response.data,
      timestamp: new Date().toISOString(),
    })

    return response.data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to fetch Portals trade estimate: ${error.message}`)
    }
    throw error
  }
}
