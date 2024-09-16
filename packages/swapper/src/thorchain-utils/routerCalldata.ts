import { THORCHAIN_ROUTER_ABI } from '@shapeshiftoss/contracts'
import type { Address } from 'viem'
import { encodeFunctionData } from 'viem'

export const depositWithExpiry = ({
  vault,
  asset,
  amount,
  memo,
  expiry,
}: {
  vault: Address
  asset: Address
  amount: bigint
  memo: string
  expiry: bigint
}) => {
  const data = encodeFunctionData({
    abi: THORCHAIN_ROUTER_ABI,
    functionName: 'depositWithExpiry',
    args: [vault, asset, amount, memo, expiry],
  })
  return data
}
