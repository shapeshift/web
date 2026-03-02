import { TronWeb } from 'tronweb'

export const convertAddressesToEvmFormat = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(v => convertAddressesToEvmFormat(v))
  }

  if (typeof value === 'string' && value.startsWith('T') && TronWeb.isAddress(value)) {
    const hex = TronWeb.address.toHex(value)
    return hex.replace(/^41/, '0x')
  }

  return value
}
