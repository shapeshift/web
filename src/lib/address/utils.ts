import { isAddress } from 'viem'
import { getEthersProvider } from 'lib/ethersProviderSingleton'

export const isEthAddress = (address: string): boolean => /^0x[0-9A-Fa-f]{40}$/.test(address)

export const isSmartContractAddress = async (address: string): Promise<boolean> => {
  if (!isAddress(address)) return false
  const bytecode = await getEthersProvider().getCode(address)
  return bytecode !== '0x'
}
