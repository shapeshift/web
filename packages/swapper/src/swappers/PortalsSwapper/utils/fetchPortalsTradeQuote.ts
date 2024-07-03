import axios from 'axios'

type PortalQuoteParams = {
  sender?: string
  inputToken: string
  inputAmount: string
  outputToken: string
  slippageTolerancePercentage?: number
}

type PortalQuoteResponse = {
  outputToken: string
  outputAmount: string
  minOutputAmount: string
  outputTokenDecimals: number
  context: {
    inputToken: string
    inputAmount: string
    inputAmountUsd: number
    outputToken: string
    outputAmount: string
    outputAmountUsd: number
    minOutputAmountUsd: number
    slippageTolerancePercentage: number
    sender?: string
  }
}

export const fetchPortalsTradeQuote = async ({
  sender,
  inputToken,
  inputAmount,
  outputToken,
  slippageTolerancePercentage,
}: PortalQuoteParams): Promise<PortalQuoteResponse> => {
  const baseUrl = 'https://api.portals.fi/v2/portal/estimate'

  const params = new URLSearchParams({
    inputToken,
    inputAmount,
    outputToken,
  })

  if (sender) {
    params.append('sender', sender)
  }

  if (slippageTolerancePercentage !== undefined) {
    params.append('slippageTolerancePercentage', slippageTolerancePercentage.toString())
  }

  try {
    const response = await axios.get<PortalQuoteResponse>(baseUrl, { params })
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to fetch Portals quote: ${error.message}`)
    }
    throw error
  }
}
