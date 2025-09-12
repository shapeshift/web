import type { ChainId } from '@shapeshiftoss/caip'
import { fromChainId } from '@shapeshiftoss/caip'
import axios from 'axios'
import type { Address } from 'viem'
import { getAddress, isAddressEqual } from 'viem'

import type {
  AssetChange,
  ParsedArgument,
  TenderlyDecodedInput,
  TenderlySimulationRequest,
  TenderlySimulationResponse,
} from './types'

import { getConfig } from '@/config'

const config = getConfig()
const TENDERLY_ACCOUNT_SLUG = config.VITE_TENDERLY_ACCOUNT_SLUG
const TENDERLY_PROJECT_SLUG = config.VITE_TENDERLY_PROJECT_SLUG
const TENDERLY_API_KEY = config.VITE_TENDERLY_API_KEY

if (!TENDERLY_ACCOUNT_SLUG || !TENDERLY_PROJECT_SLUG || !TENDERLY_API_KEY) {
  throw new Error('Missing Tenderly account/project env vars')
}

export const parseAssetChanges = (
  simulation: TenderlySimulationResponse,
  from: Address,
): AssetChange[] => {
  const changes: AssetChange[] = []
  const assetChanges = simulation.transaction.transaction_info?.asset_changes || []

  assetChanges.forEach(change => {
    if (!change || !change.token_info) {
      console.warn('Invalid asset change structure:', change)
      return
    }

    const fromAddress = change.from ? getAddress(change.from) : undefined
    const toAddress = change.to ? getAddress(change.to) : undefined

    if (!fromAddress) {
      console.warn('Missing from address in asset change:', change)
      return
    }

    if (isAddressEqual(fromAddress, from)) {
      changes.push({
        tokenAddress:
          change.token_info.contract_address === '0x0000000000000000000000000000000000000000'
            ? undefined
            : change.token_info.contract_address,
        amount: `-${change.amount}`,
        type: 'send',
        isNativeAsset:
          change.token_info.contract_address === '0x0000000000000000000000000000000000000000',
        token_info: change.token_info,
      })
    }

    if (toAddress && isAddressEqual(toAddress, from)) {
      changes.push({
        tokenAddress:
          change.token_info.contract_address === '0x0000000000000000000000000000000000000000'
            ? undefined
            : change.token_info.contract_address,
        amount: change.amount,
        type: 'receive',
        isNativeAsset:
          change.token_info.contract_address === '0x0000000000000000000000000000000000000000',
        token_info: change.token_info,
      })
    }
  })

  return changes
}

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
    children?: any[]
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
          children?: any[]
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

export const simulateTransaction = async ({
  chainId,
  from,
  to,
  data: inputData,
  value,
  gasPrice,
}: {
  chainId: ChainId
  from: string
  to: string
  data: string
  value?: string
  gasPrice?: string
}): Promise<TenderlySimulationResponse | null> => {
  try {
    const { chainReference } = fromChainId(chainId)
    const networkId = chainReference

    const requestBody: TenderlySimulationRequest = {
      network_id: networkId,
      from,
      to,
      input: inputData,
      value,
      gas_price: gasPrice,
    }

    const { data } = await axios.post<TenderlySimulationResponse>(
      `https://api.tenderly.co/api/v1/account/${TENDERLY_ACCOUNT_SLUG}/project/${TENDERLY_PROJECT_SLUG}/simulate`,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Access-Key': TENDERLY_API_KEY,
        },
      },
    )

    return data
  } catch (error) {
    console.error('Failed to simulate transaction with Tenderly:', error)
    return null
  }
}
