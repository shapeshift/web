import type { ChainId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import { viemClientByChainId } from '@shapeshiftoss/contracts'
import { getAddress, isAddress } from 'viem'

export const isSmartContractAddress = async (
  address: string,
  chainId: ChainId,
): Promise<boolean> => {
  if (!isAddress(address)) return false
  if (!isEvmChainId(chainId)) return false
  const bytecode = await viemClientByChainId[chainId].getBytecode({ address: getAddress(address) })
  return bytecode !== undefined
}
