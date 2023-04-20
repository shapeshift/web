import type { Asset } from '@shapeshiftoss/asset-service'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { EvmBaseAdapter, EvmChainId } from '@shapeshiftoss/chain-adapters'
import type { ETHSignTx, HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { QuoteFeeData, SwapErrorRight } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapError, SwapErrorType } from 'lib/swapper/api'
import { getThorTxInfo } from 'lib/swapper/swappers/ThorchainSwapper/evm/utils/getThorTxData'
import type { ThorEvmSupportedChainId } from 'lib/swapper/swappers/ThorchainSwapper/ThorchainSwapper'
import type { ThorchainSwapperDeps } from 'lib/swapper/swappers/ThorchainSwapper/types'

import { getFees } from '../../utils/helpers/helpers'

type MakeTradeTxArgs<T extends EvmChainId> = {
  wallet: HDWallet
  accountNumber: number
  sellAmountCryptoBaseUnit: string
  buyAsset: Asset
  sellAsset: Asset
  destinationAddress: string
  adapter: EvmBaseAdapter<ThorEvmSupportedChainId>
  slippageTolerance: string
  feeData: QuoteFeeData<T>
  deps: ThorchainSwapperDeps
}

export const makeTradeTx = async ({
  wallet,
  accountNumber,
  sellAmountCryptoBaseUnit,
  buyAsset,
  sellAsset,
  destinationAddress,
  adapter,
  slippageTolerance,
  feeData,
  deps,
}: MakeTradeTxArgs<EvmChainId>): Promise<
  Result<
    {
      txToSign: ETHSignTx
    },
    SwapErrorRight
  >
> => {
  try {
    const { assetNamespace } = fromAssetId(sellAsset.assetId)
    const isErc20Trade = assetNamespace === 'erc20'

    const maybeThorTxInfo = await getThorTxInfo({
      deps,
      sellAsset,
      buyAsset,
      sellAmountCryptoBaseUnit,
      slippageTolerance,
      destinationAddress,
      buyAssetTradeFeeUsd: feeData.buyAssetTradeFeeUsd,
    })

    if (maybeThorTxInfo.isErr()) return Err(maybeThorTxInfo.unwrapErr())

    const thorTxInfo = maybeThorTxInfo.unwrap()

    const { data, router } = thorTxInfo

    return Ok(
      await adapter.buildCustomTx({
        wallet,
        accountNumber,
        to: router,
        value: isErc20Trade ? '0' : sellAmountCryptoBaseUnit,
        data,
        ...(await getFees({ wallet, feeData })),
      }),
    )
  } catch (e) {
    if (e instanceof SwapError)
      return Err(
        makeSwapErrorRight({
          message: e.message,
          code: e.code,
          details: e.details,
        }),
      )
    return Err(
      makeSwapErrorRight({
        message: '[makeTradeTx]: error making trade tx',
        cause: e,
        code: SwapErrorType.BUILD_TRADE_FAILED,
      }),
    )
  }
}
