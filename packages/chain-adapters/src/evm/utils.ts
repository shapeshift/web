import { Contract } from 'ethers'

import erc20Abi from './erc20Abi.json'

export const getErc20Data = async (
  to: string,
  value: string,
  contractAddress?: string,
): Promise<string> => {
  if (!contractAddress) return ''
  const erc20Contract = new Contract(contractAddress, erc20Abi)
  const { data: callData } = await erc20Contract.transfer.populateTransaction(to, value)
  return callData || ''
}
