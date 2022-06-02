import Web3 from 'web3'

import { routerAbi } from './routerAbi'

export const deposit = async (
  contractAddress: string,
  vault: string,
  asset: string,
  amount: string,
  memo: string
) => {
  const web3 = new Web3()
  const routerContract = new web3.eth.Contract(routerAbi, contractAddress)
  const data = routerContract.methods.deposit(vault, asset, amount, memo).encodeABI()
  return data
}
