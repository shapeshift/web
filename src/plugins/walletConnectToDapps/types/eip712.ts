import { validateTypedData } from 'viem'

// Type guards and validation
export const isEIP712TypedData = (data: unknown): boolean => {
  try {
    // Use viem's more robust validation
    validateTypedData(data)
    return true
  } catch {
    return false
  }
}

// Get the Solidity type category for special formatting
export type SolidityTypeCategory =
  | 'address'
  | 'uint'
  | 'int'
  | 'bytes'
  | 'bool'
  | 'string'
  | 'array'

export const getSolidityTypeCategory = (type: string): SolidityTypeCategory => {
  if (type === 'address') return 'address'
  if (type.startsWith('uint')) return 'uint'
  if (type.startsWith('int')) return 'int'
  if (type.startsWith('bytes')) return 'bytes'
  if (type === 'bool') return 'bool'
  if (type === 'string') return 'string'
  if (type.includes('[')) return 'array'
  return 'string' // default
}
