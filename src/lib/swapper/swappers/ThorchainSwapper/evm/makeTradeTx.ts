import { fromAssetId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import type { ETHSignTx, HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { Asset } from 'lib/asset-service'
import type { QuoteFeeData, SwapErrorRight } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapError, SwapErrorType } from 'lib/swapper/api'
import { getThorTxInfo } from 'lib/swapper/swappers/ThorchainSwapper/evm/utils/getThorTxData'
import type { ThorEvmSupportedChainAdapter } from 'lib/swapper/swappers/ThorchainSwapper/ThorchainSwapper'
import type { ThorchainSwapperDeps } from 'lib/swapper/swappers/ThorchainSwapper/types'
import { getFeesFromContractData } from 'lib/swapper/swappers/utils/helpers/helpers'

type MakeTradeTxArgs<T extends EvmChainId> = {
  wallet: HDWallet
  accountNumber: number
  sellAmountCryptoBaseUnit: string
  buyAsset: Asset
  sellAsset: Asset
  destinationAddress: string
  adapter: ThorEvmSupportedChainAdapter
  slippageTolerance: string
  feeData: QuoteFeeData<T>
  affiliateBps: string
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
  affiliateBps,
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
      protocolFees: feeData.protocolFees,
      affiliateBps,
    })

    if (maybeThorTxInfo.isErr()) return Err(maybeThorTxInfo.unwrapErr())

    const thorTxInfo = maybeThorTxInfo.unwrap()

    const { data, router } = thorTxInfo

    const value = isErc20Trade ? '0' : sellAmountCryptoBaseUnit

    const { feesWithGasLimit } = await getFeesFromContractData({
      accountNumber,
      adapter,
      to: router,
      value,
      data,
      wallet,
    })

    return Ok(
      await adapter.buildCustomTx({
        wallet,
        accountNumber,
        to: router,
        value,
        data,
        ...feesWithGasLimit,
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
