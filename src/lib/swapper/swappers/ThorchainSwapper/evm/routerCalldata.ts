import { encodeFunctionData } from 'viem'
import { routerAbi } from 'lib/swapper/swappers/ThorchainSwapper/evm/routerAbi'

export const depositWithExpiry = ({
  vault,
  asset,
  amount,
  memo,
  expiry,
}: {
  vault: string
  asset: string
  amount: string
  memo: string
  expiry: number
}) => {
  const data = encodeFunctionData({
    abi: routerAbi,
    functionName: 'depositWithExpiry',
    args: [vault, asset, amount, memo, expiry],
  })
  return data
}
