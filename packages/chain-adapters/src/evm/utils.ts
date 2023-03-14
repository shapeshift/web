import { Contract } from '@ethersproject/contracts'

import erc20Abi from './erc20Abi.json'

export const getErc20Data = async (
  to: string,
  value: string,
  contractAddress?: string,
): Promise<string> => {
  if (!contractAddress) return ''
  const erc20Contract = new Contract(contractAddress, erc20Abi)
  const { data: callData } = await erc20Contract.populateTransaction.transfer(to, value)
  return callData || ''
}
