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

export type TenderlyBalanceChange = {
  address: string
  original: string
  dirty: string
  is_dirty: boolean
}

type TenderlyAssetChange = {
  token_info: {
    standard: string
    type: string
    contract_address: string
    symbol: string
    name: string
    logo: string
    decimals: number
    dollar_value: string
  }
  type: string
  from: string
  to?: string // Optional for Burn operations
  amount: string
  raw_amount: string
  dollar_value: string
  from_before_balance?: string
  to_before_balance?: string
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
    transaction_info?: {
      asset_changes?: TenderlyAssetChange[]
    }
  }
  asset_changes?: TenderlyAssetChange[]
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

export type AssetChange = {
  userAddress: string
  tokenAddress?: string // undefined for native ETH, contract address for ERC20
  amount: string
  rawAmount: string
  type: 'send' | 'receive'
  isNativeAsset: boolean
  symbol: string
  decimals: number
  dollarValue?: string
}

export const parseAssetChanges = (
  simulation: TenderlySimulationResponse,
  userAddress: string,
): AssetChange[] => {
  const changes: AssetChange[] = []
  const userAddressLower = userAddress.toLowerCase()

  // Parse asset changes from Tenderly's transaction.transaction_info.asset_changes array
  const assetChanges = simulation.transaction.transaction_info?.asset_changes || []
  
  assetChanges.forEach((change) => {
    // Safety check for change.token_info
    if (!change || !change.token_info) {
      console.warn('Invalid asset change structure:', change)
      return
    }

    const fromAddress = change.from?.toLowerCase()
    const toAddress = change.to?.toLowerCase()
    
    if (!fromAddress) {
      console.warn('Missing from address in asset change:', change)
      return
    }
    
    // Check if user is sending tokens (including Burn operations)
    if (fromAddress === userAddressLower) {
      changes.push({
        userAddress: userAddress,
        tokenAddress: change.token_info.contract_address === '0x0000000000000000000000000000000000000000' 
          ? undefined // Native ETH
          : change.token_info.contract_address,
        amount: `-${change.amount}`, // Negative for send
        rawAmount: `-${change.raw_amount}`,
        type: 'send',
        isNativeAsset: change.token_info.contract_address === '0x0000000000000000000000000000000000000000',
        symbol: change.token_info.symbol,
        decimals: change.token_info.decimals,
        dollarValue: change.dollar_value,
      })
    }

    // Check if user is receiving tokens (only for Transfer operations that have 'to' address)
    if (toAddress && toAddress === userAddressLower) {
      changes.push({
        userAddress: userAddress,
        tokenAddress: change.token_info.contract_address === '0x0000000000000000000000000000000000000000' 
          ? undefined // Native ETH
          : change.token_info.contract_address,
        amount: change.amount,
        rawAmount: change.raw_amount,
        type: 'receive',
        isNativeAsset: change.token_info.contract_address === '0x0000000000000000000000000000000000000000',
        symbol: change.token_info.symbol,
        decimals: change.token_info.decimals,
        dollarValue: change.dollar_value,
      })
    }
  })

  return changes
}

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
