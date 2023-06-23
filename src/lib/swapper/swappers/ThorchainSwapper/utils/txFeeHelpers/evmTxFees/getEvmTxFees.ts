import type { EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
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
  supportsEIP1559: boolean
  value: string
  wallet?: HDWallet
}

type EvmTxFees = {
  networkFeeCryptoBaseUnit: string
}

export const getEvmTxFees = async (
  args: GetEvmTxFeesArgs,
): Promise<Result<EvmTxFees, SwapErrorRight>> => {
  const { accountNumber, adapter, data, supportsEIP1559, value, router, wallet } = args
  try {
    // if we have a wallet, we are trying to build the actual trade, get accurate gas estimation
    if (wallet) {
      const { networkFeeCryptoBaseUnit } = await getFees({
        accountNumber,
        adapter,
        to: router,
        data,
        value,
        wallet,
      })

      return Ok({ networkFeeCryptoBaseUnit })
    }

    const { average } = await adapter.getGasFeeData()

    const networkFeeCryptoBaseUnit = calcNetworkFeeCryptoBaseUnit({
      ...average,
      supportsEIP1559,
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
