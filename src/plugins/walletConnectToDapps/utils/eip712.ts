import type { StructuredField } from '@/plugins/walletConnectToDapps/components/WalletConnectSigningModal/StructuredMessage/StructuredMessage'
import type { EIP712Value } from '@/plugins/walletConnectToDapps/types'

export const convertEIP712ToStructuredFields = (
  message: Record<string, EIP712Value>,
  primaryType: string,
): StructuredField[] => {
  const fields: StructuredField[] = []

  fields.push({
    key: 'Primary Type',
    value: primaryType,
  })

  Object.entries(message).forEach(([key, value]) => {
    fields.push(convertEIP712Value(key, value))
  })

  return fields
}

const convertEIP712Value = (key: string, value: EIP712Value): StructuredField => {
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

  if (Array.isArray(value)) {
    return {
      key,
      value,
    }
  }

  return {
    key,
    value,
  }
}
