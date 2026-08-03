import { THORCHAIN_ROUTER_ABI } from '@shapeshiftoss/contracts'
import type { Address } from 'viem'
import { encodeFunctionData, parseAbiItem } from 'viem'

const SWAP_IN_ABI_ITEM = parseAbiItem(
  'function swapIn(address tcRouter, address tcVault, string tcMemo, address token, uint256 amount, uint256 amountOutMin, uint256 deadline)',
)

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

export const swapIn = ({
  tcRouter,
  tcVault,
  tcMemo,
  token,
  amount,
  amountOutMin,
  deadline,
}: {
  tcRouter: Address
  tcVault: Address
  tcMemo: string
  token: Address
  amount: bigint
  amountOutMin: bigint
  deadline: bigint
}) => {
  const data = encodeFunctionData({
    abi: [SWAP_IN_ABI_ITEM],
    functionName: 'swapIn',
    args: [tcRouter, tcVault, tcMemo, token, amount, amountOutMin, deadline],
  })
  return data
}
