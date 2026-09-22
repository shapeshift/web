import { tron } from '@shapeshiftoss/chain-adapters'
import { bn } from '@shapeshiftoss/utils'
import type { Address } from 'viem'
import { encodeFunctionData, parseAbiItem } from 'viem'

import type { SunioRoute } from '../types'

const SUNIO_SWAP_EXACT_INPUT_ABI = parseAbiItem(
  'function swapExactInput(address[], string[], uint256[], uint24[], (uint256,uint256,address,uint256))',
)

type BuildSunioSwapCalldataArgs = {
  route: SunioRoute
  sellAmountCryptoBaseUnit: string
  minBuyAmountCryptoBaseUnit: string
  recipient: string
  slippageTolerancePercentageDecimal: string
  // epoch ms
  deadline: number
}

// SmartExchangeRouter swapExactInput calldata - the TVM ABI is EVM-compatible, addresses as 20-byte bodies
export const buildSunioSwapCalldata = ({
  route,
  sellAmountCryptoBaseUnit,
  minBuyAmountCryptoBaseUnit,
  recipient,
  slippageTolerancePercentageDecimal,
  deadline,
}: BuildSunioSwapCalldataArgs): string => {
  const amountOutMin = bn(minBuyAmountCryptoBaseUnit)
    .times(bn(1).minus(slippageTolerancePercentageDecimal))
    .toFixed(0)

  // The SmartExchangeRouter expects sum(versionLen) === path.length: the first pool segment consumes
  // 2 tokens (input + output) and each subsequent pool reuses the previous output, consuming 1 new
  // token. Relies on the Sun.io API returning poolVersions per-hop (poolVersions.length ===
  // tokens.length - 1), which it does.
  const versionLen = route.poolVersions.map((_, index) => (index === 0 ? 2n : 1n))

  const swapData = [
    BigInt(sellAmountCryptoBaseUnit),
    BigInt(amountOutMin),
    tron.toTronHex(recipient) as Address,
    BigInt(Math.floor(deadline / 1000)),
  ] as const

  return encodeFunctionData({
    abi: [SUNIO_SWAP_EXACT_INPUT_ABI],
    functionName: 'swapExactInput',
    args: [
      route.tokens.map(tron.toTronHex) as Address[],
      route.poolVersions,
      versionLen,
      route.poolFees.map(Number),
      swapData,
    ],
  })
}
