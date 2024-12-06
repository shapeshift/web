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
  slippageTolerancePercentage: number
  // Technically optional, but we always want to use an affiliate addy
  partner: string
  feePercentage?: number
  // Technically optional, but we want to explicitly specify validate
  validate: boolean
  swapperConfig: SwapperConfig
}

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
  partner,
  feePercentage,
  validate,
  swapperConfig,
}: PortalsTradeOrderParams): Promise<PortalsTradeOrderResponse> => {
  const url = `${swapperConfig.REACT_APP_PORTALS_BASE_URL}/v2/portal`

  const params = new URLSearchParams({
    partner,
    ...(sender ? { sender } : {}),
    inputToken,
    inputAmount,
    outputToken,
    validate: validate.toString(),
  })

  params.append('slippageTolerancePercentage', slippageTolerancePercentage.toFixed(2)) // Portals API expects a string with at most 2 decimal places

  if (feePercentage) {
    params.append('feePercentage', feePercentage.toString())
  }

  try {
    const response = await axios.get<PortalsTradeOrderResponse>(url, { params })
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if ((error as AxiosError<{ message: string }>).response?.data?.message) {
        throw new PortalsError((error as AxiosError<{ message: string }>).response?.data.message!)
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
  const url = `${swapperConfig.REACT_APP_PORTALS_BASE_URL}/v2/portal/estimate`

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
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to fetch Portals trade estimate: ${error.message}`)
    }
    throw error
  }
}
