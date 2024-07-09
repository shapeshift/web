import type { ChainId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import { isAddress } from 'viem'
import { getEthersProvider } from 'lib/ethersProviderSingleton'

export const isEthAddress = (address: string): boolean => /^0x[0-9A-Fa-f]{40}$/.test(address)

export const isSmartContractAddress = async (
  address: string,
  chainId: ChainId,
): Promise<boolean> => {
  if (!isAddress(address)) return false
  if (!isEvmChainId(chainId)) return false
  const bytecode = await getEthersProvider(chainId).getCode(address)
  return bytecode !== '0x'
}
