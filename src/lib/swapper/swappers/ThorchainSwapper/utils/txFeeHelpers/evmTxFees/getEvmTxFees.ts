import type { EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import type { ETHWallet, HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { Result } from '@sniptt/monads/build'
import { Err, Ok } from '@sniptt/monads/build'
import type { SwapErrorRight } from 'lib/swapper/api'
import { makeSwapErrorRight } from 'lib/swapper/api'
import { THOR_EVM_GAS_LIMIT } from 'lib/swapper/swappers/ThorchainSwapper/utils/constants'
import { calcNetworkFeeCryptoBaseUnit, getFees } from 'lib/utils/evm'

type GetEvmTxFeesArgs = {
  adapter: EvmChainAdapter
  accountNumber: number
  data: string
  router: string
  eip1559Support: boolean
  value: string
  wallet?: HDWallet
  from?: string
}

type EvmTxFees = {
  networkFeeCryptoBaseUnit: string
}

export const getEvmTxFees = async (
  args: GetEvmTxFeesArgs,
): Promise<Result<EvmTxFees, SwapErrorRight>> => {
  const { adapter, data, eip1559Support, value, router, wallet, from } = args
  try {
    // if we have a wallet, we are trying to build the actual trade, get accurate gas estimation

    if (from && wallet) {
      const supportsEIP1559 = await (wallet as ETHWallet)?.ethSupportsEIP1559()
      const { networkFeeCryptoBaseUnit } = await getFees({
        adapter,
        from,
        supportsEIP1559,
        to: router,
        data,
        value,
      })

      return Ok({ networkFeeCryptoBaseUnit })
    }

    const { average } = await adapter.getGasFeeData()

    const networkFeeCryptoBaseUnit = calcNetworkFeeCryptoBaseUnit({
      ...average,
      supportsEIP1559: eip1559Support,
      gasLimit: THOR_EVM_GAS_LIMIT, // hardcoded default for quote estimation (no wallet)
    })

    return Ok({ networkFeeCryptoBaseUnit })
  } catch (err) {
    return Err(
      makeSwapErrorRight({
        message: `[Thorchain: getEvmTxFees] - failed to get networkFeeCryptoBaseUnit`,
        cause: err,
      }),
    )
  }
}
