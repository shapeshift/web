export const base64ToHex = (b64: string): string => {
  if (!b64) return b64
  return Buffer.from(b64, 'base64').toString('hex')
}

export const hexToBase64 = (hex: string): string => {
  return Buffer.from(hex, 'hex').toString('base64')
}

export const isHexHash = (str: string): boolean => {
  return str.length === 64 && /^[0-9a-f]+$/i.test(str)
}
