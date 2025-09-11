import type { ChainId } from '@shapeshiftoss/caip'
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

type TenderlyDecodedInput = {
  soltype: {
    name: string
    type: string
    storage_location?: string
    offset?: number
    index?: string
    indexed?: boolean
    simple_type?: {
      type: string
      nested_type?: {
        type: string
      }
    }
    components?: {
      name: string
      type: string
      storage_location?: string
      offset?: number
      index?: string
      indexed?: boolean
      simple_type?: {
        type: string
      }
    }[]
  }
  value: any
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
      call_trace?: {
        decoded_input?: TenderlyDecodedInput[]
      }
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

export type { TenderlyDecodedInput }

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

  assetChanges.forEach(change => {
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

    if (fromAddress === userAddressLower) {
      changes.push({
        userAddress,
        tokenAddress:
          change.token_info.contract_address === '0x0000000000000000000000000000000000000000'
            ? undefined // Native ETH
            : change.token_info.contract_address,
        amount: `-${change.amount}`, // Negative for send
        rawAmount: `-${change.raw_amount}`,
        type: 'send',
        isNativeAsset:
          change.token_info.contract_address === '0x0000000000000000000000000000000000000000',
        symbol: change.token_info.symbol,
        decimals: change.token_info.decimals,
        dollarValue: change.dollar_value,
      })
    }

    if (toAddress && toAddress === userAddressLower) {
      changes.push({
        userAddress,
        tokenAddress:
          change.token_info.contract_address === '0x0000000000000000000000000000000000000000'
            ? undefined // Native ETH
            : change.token_info.contract_address,
        amount: change.amount,
        rawAmount: change.raw_amount,
        type: 'receive',
        isNativeAsset:
          change.token_info.contract_address === '0x0000000000000000000000000000000000000000',
        symbol: change.token_info.symbol,
        decimals: change.token_info.decimals,
        dollarValue: change.dollar_value,
      })
    }
  })

  return changes
}

export type ParsedArgument = {
  name: string
  type: string
  value: any
  components?: ParsedArgument[] // For tuple/struct types
}

// Convert ParsedArgument to StructuredField format
export const convertToStructuredFields = (
  args: ParsedArgument[],
): {
  key: string
  value: any
  type: string
  children?: {
    key: string
    value: any
    type: string
    children?: any
  }[]
}[] => {
  return args.map(arg => {
    const convertComponents = (
      components?: ParsedArgument[],
    ):
      | {
          key: string
          value: any
          type: string
          children?: any
        }[]
      | undefined => {
      if (!components) return undefined
      return components.map(comp => ({
        key: comp.name,
        value: comp.value,
        type: comp.type,
        children: comp.components ? convertComponents(comp.components) : undefined,
      }))
    }

    return {
      key: arg.name,
      value: arg.value,
      type: arg.type,
      children: convertComponents(arg.components),
    }
  })
}

export const parseDecodedInput = (simulation: TenderlySimulationResponse): ParsedArgument[] => {
  const decodedInput = simulation.transaction.transaction_info?.call_trace?.decoded_input
  if (!decodedInput || decodedInput.length === 0) return []

  const parseValue = (input: TenderlyDecodedInput): ParsedArgument => {
    const { soltype, value } = input

    if (soltype.type.includes('tuple') && soltype.components) {
      if (Array.isArray(value)) {
        const tupleItems = value
          .map((tupleItem: any, tupleIndex: number) => {
            if (typeof tupleItem === 'object' && tupleItem !== null) {
              const tupleComponents: ParsedArgument[] = Object.entries(tupleItem).map(
                ([key, val]) => {
                  const componentDef = soltype.components?.find(comp => comp.name === key)
                  return {
                    name: key,
                    type: componentDef?.type || 'unknown',
                    value: val,
                    components: undefined,
                  }
                },
              )
              return {
                name: `Item ${tupleIndex + 1}`,
                type: soltype.type.replace('[]', ''),
                value: tupleItem,
                components: tupleComponents,
              } as ParsedArgument
            }
            return null
          })
          .filter((item): item is ParsedArgument => item !== null)

        return {
          name: soltype.name,
          type: soltype.type,
          value,
          components: tupleItems,
        }
      } else if (typeof value === 'object' && value !== null) {
        const components: ParsedArgument[] = Object.entries(value).map(([key, val]) => {
          const componentDef = soltype.components?.find(comp => comp.name === key)
          return {
            name: key,
            type: componentDef?.type || 'unknown',
            value: val,
            components: undefined,
          }
        })

        return {
          name: soltype.name,
          type: soltype.type,
          value,
          components,
        }
      }
    }

    if (soltype.type.includes('[]') && Array.isArray(value)) {
      return {
        name: soltype.name,
        type: soltype.type,
        value,
        components: undefined,
      }
    }

    return {
      name: soltype.name,
      type: soltype.type,
      value,
      components: undefined,
    }
  }

  return decodedInput.map(parseValue)
}

export const fetchSimulation = async ({
  chainId,
  from,
  to,
  data,
}: {
  chainId: ChainId
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
