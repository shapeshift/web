import type { StructuredField } from '@/plugins/walletConnectToDapps/components/StructuredMessage/StructuredMessage'
import type { EIP712Value } from '@/plugins/walletConnectToDapps/types'

// Convert EIP712 message data to StructuredField format
export const convertEIP712ToStructuredFields = (
  message: Record<string, EIP712Value>,
  primaryType?: string,
): StructuredField[] => {
  const fields: StructuredField[] = []

  // Add primary type if provided
  if (primaryType) {
    fields.push({
      key: 'Primary Type',
      value: primaryType,
    })
  }

  // Convert message fields
  Object.entries(message).forEach(([key, value]) => {
    fields.push(convertEIP712Value(key, value))
  })

  return fields
}

const convertEIP712Value = (key: string, value: EIP712Value): StructuredField => {
  // Handle nested objects
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const children = Object.entries(value as Record<string, EIP712Value>).map(
      ([childKey, childValue]) => convertEIP712Value(childKey, childValue),
    )

    return {
      key,
      value,
      children,
    }
  }

  // Handle arrays
  if (Array.isArray(value)) {
    return {
      key,
      value,
    }
  }

  // Handle simple values
  return {
    key,
    value,
  }
}
