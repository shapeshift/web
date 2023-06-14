import { fromAssetId } from '@shapeshiftoss/caip'
import type { ETHSignTx, HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { Asset } from 'lib/asset-service'
import type { SwapErrorRight } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapErrorType } from 'lib/swapper/api'
import type { ThorEvmSupportedChainAdapter } from 'lib/swapper/swappers/ThorchainSwapper/ThorchainSwapper'
import { createBuildCustomTxInput } from 'lib/utils/evm'

type MakeTradeTxArgs = {
  accountNumber: number
  adapter: ThorEvmSupportedChainAdapter
  data: string
  router: string
  sellAmountCryptoBaseUnit: string
  sellAsset: Asset
  wallet: HDWallet
}

type TradeTx = {
  txToSign: ETHSignTx
}

export const makeTradeTx = async (
  args: MakeTradeTxArgs,
): Promise<Result<TradeTx, SwapErrorRight>> => {
  const { accountNumber, adapter, data, router, sellAmountCryptoBaseUnit, sellAsset, wallet } = args
  const { assetNamespace } = fromAssetId(sellAsset.assetId)
  const isErc20Trade = assetNamespace === 'erc20'

  try {
    const buildCustomTxInput = await createBuildCustomTxInput({
      accountNumber,
      adapter,
      to: router,
      value: isErc20Trade ? '0' : sellAmountCryptoBaseUnit,
      data,
      wallet,
    })

    const { txToSign } = await adapter.buildCustomTx(buildCustomTxInput)

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
