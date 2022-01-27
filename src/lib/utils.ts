// we don't want utils to mutate by default, so spreading here is ok
export const upsertArray = <T extends unknown>(arr: T[], item: T): T[] =>
  arr.includes(item) ? arr : [...arr, item]

export const isEthAddress = (address: string) => {
  return /^0x[0-9A-Fa-f]{40}$/.test(address)
}
