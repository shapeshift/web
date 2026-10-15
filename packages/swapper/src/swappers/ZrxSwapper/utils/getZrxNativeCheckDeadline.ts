import type { Hex } from 'viem'
import { decodeFunctionData, parseAbi, toFunctionSelector } from 'viem'

const settlerAbi = parseAbi([
  'function execute((address recipient, address buyToken, uint256 minAmountOut) slippage, bytes[] actions, bytes32 zid)',
  'function NATIVE_CHECK(uint256 deadline, uint256 msgValue)',
])

const NATIVE_CHECK_SELECTOR = toFunctionSelector('function NATIVE_CHECK(uint256,uint256)')

// Native sells carry no Permit2, but Settler reverts with SignatureExpired past the NATIVE_CHECK deadline
export const getZrxNativeCheckDeadline = (data: string): number | undefined => {
  try {
    const { functionName, args } = decodeFunctionData({ abi: settlerAbi, data: data as Hex })
    if (functionName !== 'execute') return undefined

    const nativeCheck = args[1].find(action => action.startsWith(NATIVE_CHECK_SELECTOR))
    if (!nativeCheck) return undefined

    const decoded = decodeFunctionData({ abi: settlerAbi, data: nativeCheck })
    if (decoded.functionName !== 'NATIVE_CHECK') return undefined

    return Number(decoded.args[0])
  } catch {
    return undefined
  }
}
