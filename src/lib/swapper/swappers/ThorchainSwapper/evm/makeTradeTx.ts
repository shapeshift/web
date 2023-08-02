import type { ETHSignTx } from '@shapeshiftoss/hdwallet-core'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { Asset } from 'lib/asset-service'
import type { SwapErrorRight } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapErrorType } from 'lib/swapper/api'
import type { ThorEvmSupportedChainAdapter } from 'lib/swapper/swappers/ThorchainSwapper/types'
import { createBuildCustomApiTxInput } from 'lib/utils/evm'

import { isNativeEvmAsset } from '../../utils/helpers/helpers'

type MakeTradeTxArgs = {
  accountNumber: number
  adapter: ThorEvmSupportedChainAdapter
  data: string
  router: string
  sellAmountCryptoBaseUnit: string
  sellAsset: Asset
  from: string
  supportsEIP1559: boolean
}

type TradeTx = {
  txToSign: ETHSignTx
}

export const makeTradeTx = async (
  args: MakeTradeTxArgs,
): Promise<Result<TradeTx, SwapErrorRight>> => {
  const {
    accountNumber,
    adapter,
    data,
    router,
    sellAmountCryptoBaseUnit,
    sellAsset,
    from,
    supportsEIP1559,
  } = args

  try {
    const buildCustomTxInput = await createBuildCustomApiTxInput({
      accountNumber,
      adapter,
      to: router,
      value: isNativeEvmAsset(sellAsset.assetId) ? sellAmountCryptoBaseUnit : '0',
      data,
      from,
      supportsEIP1559,
    })

    const txToSign = await adapter.buildCustomApiTx(buildCustomTxInput)

    return Ok({ txToSign })
  } catch (e) {
    return Err(
      makeSwapErrorRight({
        message: '[Thorchain: makeTradeTx]: failed to build and broadcast transaction',
        cause: e,
        code: SwapErrorType.BUILD_TRADE_FAILED,
      }),
    )
  }
}
