import type { ETHSignTx, HDWallet } from '@shapeshiftoss/hdwallet-core'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { Asset } from 'lib/asset-service'
import type { SwapErrorRight } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapErrorType } from 'lib/swapper/api'
import type { ThorEvmSupportedChainAdapter } from 'lib/swapper/swappers/ThorchainSwapper/ThorchainSwapper'
import { createBuildCustomTxInput, getFees } from 'lib/utils/evm'

import { isNativeEvmAsset } from '../../utils/helpers/helpers'

type MakeTradeTxArgs = {
  adapter: ThorEvmSupportedChainAdapter
  data: string
  router: string
  sellAmountCryptoBaseUnit: string
  sellAsset: Asset
  wallet: HDWallet
  accountNumber: number
}

type TradeTx = {
  txToSign: ETHSignTx
}

export const makeTradeTx = async (
  args: MakeTradeTxArgs,
): Promise<Result<TradeTx, SwapErrorRight>> => {
  const { adapter, data, router, sellAmountCryptoBaseUnit, sellAsset, wallet, accountNumber } = args

  const supportsEIP1559 = supportsETH(wallet) && (await wallet.ethSupportsEIP1559())

  const from = await adapter.getAddress({ accountNumber, wallet })

  const fees = await getFees({
    adapter,
    to: router,
    data,
    value: isNativeEvmAsset(sellAsset.assetId) ? sellAmountCryptoBaseUnit : '0',
    from,
    supportsEIP1559,
  })
  try {
    const buildCustomTxInput = await createBuildCustomTxInput({
      accountNumber,
      wallet,
      adapter,
      to: router,
      value: isNativeEvmAsset(sellAsset.assetId) ? sellAmountCryptoBaseUnit : '0',
      data,
      chainSpecific: fees,
    })

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
