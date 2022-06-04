export const isEthAddress = (address: string) => {
  return /^0x[0-9A-Fa-f]{40}$/.test(address)
}
