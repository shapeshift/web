import { bn } from '@shapeshiftoss/chain-adapters'
import { subtractBasisPointAmount } from '@shapeshiftoss/utils'
import BigNumber from 'bignumber.js'

export const getLimitWithManualSlippage = ({
  expectedAmountOutThorBaseUnit,
  slippageBps,
}: {
  expectedAmountOutThorBaseUnit: string
  slippageBps: BigNumber.Value
}) => {
  const limitWithManualSlippage = subtractBasisPointAmount(
    bn(expectedAmountOutThorBaseUnit).toFixed(0, BigNumber.ROUND_DOWN),
    slippageBps,
    BigNumber.ROUND_DOWN,
  )

  return limitWithManualSlippage
}
