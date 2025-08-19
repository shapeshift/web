export const isEthAddress = (address: string): boolean => /^0x[0-9A-Fa-f]{40}$/.test(address)
