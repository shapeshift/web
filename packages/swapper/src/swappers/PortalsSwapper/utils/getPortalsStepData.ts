import { fromChainId } from '@shapeshiftoss/caip'
import type { Hex } from 'viem'
import { getAddress } from 'viem'

import { getEvmNetworkFeeCryptoBaseUnit } from '../../../evm-utils'
import type { StepDataArgs, TxBuildData } from '../../../types'
import { simulateWithStateOverrides } from '../../../utils/tenderly'
import type { PortalsTx } from './fetchPortalsTradeOrder'
import { fetchPortalsTradeEstimate } from './fetchPortalsTradeOrder'

type BaseArgs = {
  tx: PortalsTx
}

// Rates simulate the order tx via Tenderly (falling back to the Portals estimate endpoint) so an
// unapproved sender still prices
type GetPortalsStepDataArgs = StepDataArgs<
  BaseArgs,
  {
    target: string
    inputToken: string
    outputToken: string
    inputAmount: string
    slippageTolerancePercentage: number
  }
>

export const getPortalsStepData = async (
  args: GetPortalsStepDataArgs,
): Promise<{ transactionData?: TxBuildData; networkFeeCryptoBaseUnit: string }> => {
  const { tx, sellAsset, input, deps } = args

  const adapter = deps.assertGetEvmChainAdapter(sellAsset.chainId)
  const supportsEIP1559 = 'supportsEIP1559' in input ? input.supportsEIP1559 : false

  if (args.type === 'rate') {
    const gasLimit = await (async () => {
      const tenderlySimulation = await simulateWithStateOverrides(
        {
          chainId: sellAsset.chainId,
          from: tx.from,
          to: tx.to,
          data: tx.data as Hex,
          value: tx.value,
          sellAsset,
          spenderAddress: getAddress(args.target),
        },
        {
          apiKey: deps.config.VITE_TENDERLY_API_KEY,
          accountSlug: deps.config.VITE_TENDERLY_ACCOUNT_SLUG,
          projectSlug: deps.config.VITE_TENDERLY_PROJECT_SLUG,
        },
      )

      if (tenderlySimulation.success) return tenderlySimulation.gasLimit.toString()

      // Fallback to estimate endpoint (i.e simulation with overrides failed, but Portals still able to do their magic here)
      const quoteEstimateResponse = await fetchPortalsTradeEstimate({
        inputToken: args.inputToken,
        outputToken: args.outputToken,
        inputAmount: args.inputAmount,
        slippageTolerancePercentage: args.slippageTolerancePercentage,
        swapperConfig: deps.config,
      })

      return quoteEstimateResponse.context.gasLimit.toString()
    })()

    const networkFeeCryptoBaseUnit = await getEvmNetworkFeeCryptoBaseUnit({
      adapter,
      supportsEIP1559,
      gasLimit,
    })

    return { networkFeeCryptoBaseUnit }
  }

  const transactionData: TxBuildData = {
    type: 'evm',
    chainId: Number(fromChainId(sellAsset.chainId).chainReference),
    to: tx.to,
    data: tx.data,
    value: tx.value,
    // Portals simulate and pad their gas limit, so no additional buffer
    gasLimit: tx.gasLimit,
  }

  const networkFeeCryptoBaseUnit = await getEvmNetworkFeeCryptoBaseUnit({
    adapter,
    transactionData,
    from: args.from,
    supportsEIP1559,
  })

  return { transactionData, networkFeeCryptoBaseUnit }
}
