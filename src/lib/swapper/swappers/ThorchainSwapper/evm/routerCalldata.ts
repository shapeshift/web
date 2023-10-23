import { Web3 } from 'web3'
import { routerAbi } from 'lib/swapper/swappers/ThorchainSwapper/evm/routerAbi'

export const depositWithExpiry = (
  contractAddress: string,
  vault: string,
  asset: string,
  amount: string,
  memo: string,
  expiry: number,
) => {
  const web3 = new Web3()
  const routerContract = new web3.eth.Contract(routerAbi, contractAddress)
  const data = routerContract.methods
    .depositWithExpiry(vault, asset, amount, memo, expiry)
    .encodeABI()
  return data
}
