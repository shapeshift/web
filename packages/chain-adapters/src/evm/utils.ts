import { Contract } from '@ethersproject/contracts'
import BigNumber from 'bignumber.js'

import { bnOrZero } from '../utils'
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

type GetTxFee = {
  gasLimit: string
  gasPrice: string
  maxFeePerGas?: string
}

export const getTxFee = ({
  gasLimit,
  gasPrice: legacyGasPrice,
  maxFeePerGas: eip1559GasPrice,
}: GetTxFee): string => {
  const gasPrice = bnOrZero(BigNumber.max(eip1559GasPrice ?? 0, legacyGasPrice))
  return gasPrice.times(bnOrZero(gasLimit)).toFixed(0)
}
