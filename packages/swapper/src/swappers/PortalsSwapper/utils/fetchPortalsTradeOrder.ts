import axios from 'axios'

// non-exhaustive
type PortalsTradeOrderParams = {
  sender: string
  inputToken: string
  inputAmount: string
  outputToken: string
  slippageTolerancePercentage?: number
  // Technically optional, but we always want to use an affiliate addy
  partner: string
  feePercentage?: number
  validate?: boolean
}

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
  tx: {
    to: string
    from: string
    data: string
    value: string
    gasLimit: string
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
}: PortalsTradeOrderParams): Promise<PortalsTradeOrderResponse> => {
  const url = 'https://api.portals.fi/v2/portal'

  const params = new URLSearchParams({
    partner,
    sender,
    inputToken,
    inputAmount,
    outputToken,
    // This is correct - we don't really care about Portals doing validation, as we do it in the app
    // This allows us to get a quote, even if non-actionable
    validate: 'false',
  })

  if (slippageTolerancePercentage !== undefined) {
    params.append('slippageTolerancePercentage', slippageTolerancePercentage.toString())
  }

  if (feePercentage) {
    params.append('feePercentage', feePercentage.toString())
  }

  try {
    const response = await axios.get<PortalsTradeOrderResponse>(url, { params })
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to fetch Portals trade order: ${error.message}`)
    }
    throw error
  }
}
