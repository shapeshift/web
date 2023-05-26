import type { Step } from '@lifi/sdk'
import type { ChainId } from '@shapeshiftoss/caip'
import { hexToNumberString } from 'web3-utils'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { SwapError, SwapErrorType } from 'lib/swapper/api'
import { getFeesFromContractData } from 'lib/swapper/swappers/utils/helpers/helpers'
import { isEvmChainAdapter } from 'lib/utils'

import { getLifi } from '../getLifi'

export const getNetworkFeeCryptoBaseUnit = async ({
  chainId,
  lifiStep,
  eip1559Support,
}: {
  chainId: ChainId
  lifiStep: Step
  eip1559Support: boolean
}) => {
  const lifi = getLifi()
  const adapter = getChainAdapterManager().get(chainId)

  if (adapter === undefined || !isEvmChainAdapter(adapter)) {
    throw new SwapError('[getNetworkFeeCryptoBaseUnit] invalid chain adapter', {
      code: SwapErrorType.TRADE_QUOTE_FAILED,
      details: { chainId },
    })
  }

  const { transactionRequest } = await lifi.getStepTransaction(lifiStep)
  const { value, from, to, data } = transactionRequest ?? {}

  if (value === undefined || from === undefined || to === undefined || data === undefined) {
    throw new SwapError('[getNetworkFeeCryptoBaseUnit] getStepTransaction failed', {
      code: SwapErrorType.TRADE_QUOTE_FAILED,
    })
  }

  const { networkFeeCryptoBaseUnit } = await getFeesFromContractData({
    eip1559Support,
    adapter,
    from,
    to,
    value: hexToNumberString(value.toString()),
    data: data.toString(),
  })

  return networkFeeCryptoBaseUnit
}
