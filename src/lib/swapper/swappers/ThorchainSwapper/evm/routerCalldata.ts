import { Contract } from 'web3'
import { routerAbi } from 'lib/swapper/swappers/ThorchainSwapper/evm/routerAbi'

export const depositWithExpiry = (
  contractAddress: string,
  vault: string,
  asset: string,
  amount: string,
  memo: string,
  expiry: number,
) => {
  const routerContract = new Contract(routerAbi, contractAddress)
  const data = routerContract.methods
    .depositWithExpiry(vault, asset, amount, memo, expiry)
    .encodeABI()
  return data
}
