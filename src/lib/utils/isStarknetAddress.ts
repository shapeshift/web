// Starknet addresses are felts, written as 64 hex digits, sometimes without the leading zeros
export const isStarknetAddress = (address: string): boolean =>
  /^0x[0-9a-fA-F]{62,64}$/.test(address)
