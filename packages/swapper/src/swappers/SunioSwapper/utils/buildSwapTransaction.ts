import { TronWeb } from 'tronweb'

import type { SunioRoute } from '../types'
import { SUNIO_SMART_ROUTER_CONTRACT } from './constants'

export type BuildSwapTransactionArgs = {
  route: SunioRoute
  from: string
  to: string
  sellAmountCryptoBaseUnit: string
  minBuyAmountCryptoBaseUnit: string
  rpcUrl: string
  deadline?: number
}

export const buildSunioSwapTransaction = async (args: BuildSwapTransactionArgs): Promise<any> => {
  const {
    route,
    from,
    to,
    sellAmountCryptoBaseUnit,
    minBuyAmountCryptoBaseUnit,
    rpcUrl,
    deadline,
  } = args

  const tronWeb = new TronWeb({
    fullHost: rpcUrl,
  })

  const path = route.tokens

  const poolVersion = route.poolVersions

  const versionLen = Array(poolVersion.length).fill(2)

  const fees = route.poolFees.map(fee => Number(fee))

  const swapData = {
    amountIn: sellAmountCryptoBaseUnit,
    amountOutMin: minBuyAmountCryptoBaseUnit,
    recipient: to,
    deadline: deadline ?? Math.floor(Date.now() / 1000) + 60 * 20,
  }

  const parameters = [
    { type: 'address[]', value: path },
    { type: 'string[]', value: poolVersion },
    { type: 'uint256[]', value: versionLen },
    { type: 'uint24[]', value: fees },
    {
      type: 'tuple(uint256,uint256,address,uint256)',
      value: [swapData.amountIn, swapData.amountOutMin, swapData.recipient, swapData.deadline],
    },
  ]

  const functionSelector =
    'swapExactInput(address[],string[],uint256[],uint24[],(uint256,uint256,address,uint256))'

  const options = {
    feeLimit: 100_000_000,
    callValue: 0,
  }

  const txData = await tronWeb.transactionBuilder.triggerSmartContract(
    SUNIO_SMART_ROUTER_CONTRACT,
    functionSelector,
    options,
    parameters,
    from,
  )

  if (!txData.result || !txData.result.result) {
    throw new Error('[Sun.io] Failed to build swap transaction')
  }

  return txData.transaction
}
