import { fromChainId } from '@shapeshiftoss/caip'

type TenderlySimulationRequest = {
  network_id: string
  from: string
  to: string
  input: string
  gas?: number
  gas_price?: string
  value?: string
}

type TenderlySimulationResponse = {
  transaction: {
    hash: string
    status: boolean
    error_message?: string
    gas_used: number
    call_trace: {
      calls?: {
        from: string
        to: string
        input: string
        output: string
        gas_used: number
        type: string
        method?: string
      }[]
    }
  }
  simulation: {
    id: string
    project_id: string
    owner_id: string
    network_id: string
    block_number: number
    transaction_index: number
    from: string
    to: string
    input: string
    gas: number
    gas_price: string
    gas_used: number
    value: string
    status: boolean
    access_list?: any[]
    method?: string
    decoded_input?: {
      soltype: {
        name: string
        type: string
      }
      value: any
    }[]
    decoded_output?: {
      soltype: {
        name: string
        type: string
      }
      value: any
    }[]
  }
}

const TENDERLY_ACCOUNT_SLUG = '0xgomes'
const TENDERLY_PROJECT_SLUG = 'project'

export const fetchSimulation = async ({
  chainId,
  from,
  to,
  data,
}: {
  chainId: string
  from: string
  to: string
  data: string
}): Promise<TenderlySimulationResponse | null> => {
  try {
    const apiKey = import.meta.env.VITE_TENDERLY_API_KEY

    if (!apiKey) {
      console.warn('Tenderly API key not found')
      return null
    }

    // Convert chainId to networkId (extract the network reference and cast to number)
    const { chainReference } = fromChainId(chainId)
    const networkId = chainReference

    const requestBody: TenderlySimulationRequest = {
      network_id: networkId,
      from,
      to,
      input: data,
    }

    const response = await fetch(
      `https://api.tenderly.co/api/v1/account/${TENDERLY_ACCOUNT_SLUG}/project/${TENDERLY_PROJECT_SLUG}/simulate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Access-Key': apiKey,
        },
        body: JSON.stringify(requestBody),
      },
    )

    if (!response.ok) {
      throw new Error(`Tenderly API error: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()
    return result as TenderlySimulationResponse
  } catch (error) {
    console.error('Failed to simulate transaction with Tenderly:', error)
    return null
  }
}
