import { encodeFunctionData } from 'viem'

import { routerAbi } from '../swappers/ThorchainSwapper/evm/routerAbi'

export const depositWithExpiry = ({
  vault,
  asset,
  amount,
  memo,
  expiry,
}: {
  vault: string
  asset: string
  amount: string | BigInt
  memo: string
  expiry: number | BigInt
}) => {
  const data = encodeFunctionData({
    abi: routerAbi,
    functionName: 'depositWithExpiry',
    args: [vault, asset, amount, memo, expiry],
  })
  return data
}
