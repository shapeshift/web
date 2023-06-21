import type { ETHSignTx, HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { Asset } from 'lib/asset-service'
import type { SwapErrorRight } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapErrorType } from 'lib/swapper/api'
import type { ThorEvmSupportedChainAdapter } from 'lib/swapper/swappers/ThorchainSwapper/ThorchainSwapper'
import { createBuildCustomTxInput } from 'lib/utils/evm'

import { isNativeEvmAsset } from '../../utils/helpers/helpers'

type MakeTradeTxArgs = {
  from: string
  adapter: ThorEvmSupportedChainAdapter
  data: string
  router: string
  sellAmountCryptoBaseUnit: string
  sellAsset: Asset
  wallet: HDWallet
  accountNumber: number
  supportsEIP1559: boolean
}

type TradeTx = {
  txToSign: ETHSignTx
}

export const makeTradeTx = async (
  args: MakeTradeTxArgs,
): Promise<Result<TradeTx, SwapErrorRight>> => {
  const { adapter, data, router, sellAmountCryptoBaseUnit, sellAsset, wallet, accountNumber } = args

  try {
    const buildCustomTxInput = await createBuildCustomTxInput({
      accountNumber,
      wallet,
      adapter,
      to: router,
      value: isNativeEvmAsset(sellAsset.assetId) ? sellAmountCryptoBaseUnit : '0',
      data,
    })

    // TODO type chainSpecific and implement it properly
    // @ts-ignore
    const txToSign = await adapter.buildSignTx(buildCustomTxInput)

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
