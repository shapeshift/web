import type { ChainId } from '@shapeshiftoss/caip'
import { fromChainId } from '@shapeshiftoss/caip'
import type { EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import type { Asset } from '@shapeshiftoss/types'
import type { Hex } from 'viem'
import { getAddress } from 'viem'

import { getEvmNetworkFeeCryptoBaseUnit } from '../../../evm-utils'
import type { SwapperConfig, TxBuildData } from '../../../types'
import { simulateWithStateOverrides } from '../../../utils/tenderly'
import type { PortalsTx } from './fetchPortalsTradeOrder'
import { fetchPortalsTradeEstimate } from './fetchPortalsTradeOrder'

export const getPortalsRateNetworkFeeCryptoBaseUnit = async ({
  adapter,
  tx,
  sellAsset,
  target,
  inputToken,
  outputToken,
  inputAmount,
  slippageTolerancePercentage,
  supportsEIP1559,
  swapperConfig,
}: {
  adapter: EvmChainAdapter
  tx: PortalsTx
  sellAsset: Asset
  target: string
  inputToken: string
  outputToken: string
  inputAmount: string
  slippageTolerancePercentage: number
  supportsEIP1559: boolean
  swapperConfig: SwapperConfig
}): Promise<string> => {
  const gasLimit = await (async () => {
    const tenderlySimulation = await simulateWithStateOverrides(
      {
        chainId: sellAsset.chainId,
        from: tx.from,
        to: tx.to,
        data: tx.data as Hex,
        value: tx.value,
        sellAsset,
        spenderAddress: getAddress(target),
      },
      {
        apiKey: swapperConfig.VITE_TENDERLY_API_KEY,
        accountSlug: swapperConfig.VITE_TENDERLY_ACCOUNT_SLUG,
        projectSlug: swapperConfig.VITE_TENDERLY_PROJECT_SLUG,
      },
    )

    if (tenderlySimulation.success) return tenderlySimulation.gasLimit.toString()

    // Fallback to estimate endpoint (i.e simulation with overrides failed, but Portals still able to do their magic here)
    const quoteEstimateResponse = await fetchPortalsTradeEstimate({
      inputToken,
      outputToken,
      inputAmount,
      slippageTolerancePercentage,
      swapperConfig,
    })

    return quoteEstimateResponse.context.gasLimit.toString()
  })()

  return await getEvmNetworkFeeCryptoBaseUnit({ adapter, supportsEIP1559, gasLimit })
}

export const getPortalsStepData = async ({
  adapter,
  chainId,
  tx,
  from,
  supportsEIP1559,
}: {
  adapter: EvmChainAdapter
  chainId: ChainId
  tx: PortalsTx
  from: string
  supportsEIP1559: boolean
}): Promise<{ transactionData: TxBuildData; networkFeeCryptoBaseUnit: string }> => {
  const transactionData: TxBuildData = {
    type: 'evm',
    chainId: Number(fromChainId(chainId).chainReference),
    to: tx.to,
    data: tx.data,
    value: tx.value,
    // Portals simulate and pad their gas limit, so no additional buffer
    gasLimit: tx.gasLimit,
  }

  const networkFeeCryptoBaseUnit = await getEvmNetworkFeeCryptoBaseUnit({
    adapter,
    transactionData,
    from,
    supportsEIP1559,
  })

  return { transactionData, networkFeeCryptoBaseUnit }
}
