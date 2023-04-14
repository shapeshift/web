import type { Asset } from '@shapeshiftoss/asset-service'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { EvmBaseAdapter } from '@shapeshiftoss/chain-adapters'
import type { ETHSignTx, HDWallet } from '@shapeshiftoss/hdwallet-core'
import { Err } from '@sniptt/monads'
import { numberToHex } from 'web3-utils'

import { SwapError, SwapErrorType } from '../../../api'
import type { ThorEvmSupportedChainId } from '../ThorchainSwapper'
import type { ThorchainSwapperDeps } from '../types'
import { getThorTxInfo } from './utils/getThorTxData'

type MakeTradeTxArgs = {
  wallet: HDWallet
  accountNumber: number
  sellAmountCryptoBaseUnit: string
  buyAsset: Asset
  sellAsset: Asset
  destinationAddress: string
  adapter: EvmBaseAdapter<ThorEvmSupportedChainId>
  slippageTolerance: string
  deps: ThorchainSwapperDeps
  gasLimit: string
  buyAssetTradeFeeUsd: string
} & (
  | {
      gasPriceCryptoBaseUnit: string
      maxFeePerGas?: never
      maxPriorityFeePerGas?: never
    }
  | {
      gasPriceCryptoBaseUnit?: never
      maxFeePerGas: string
      maxPriorityFeePerGas: string
    }
)

export const makeTradeTx = async ({
  wallet,
  accountNumber,
  sellAmountCryptoBaseUnit,
  buyAsset,
  sellAsset,
  destinationAddress,
  adapter,
  maxFeePerGas,
  maxPriorityFeePerGas,
  gasPriceCryptoBaseUnit,
  slippageTolerance,
  deps,
  gasLimit,
  buyAssetTradeFeeUsd,
}: MakeTradeTxArgs): Promise<{
  txToSign: ETHSignTx
}> => {
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
      buyAssetTradeFeeUsd,
    })

    if (maybeThorTxInfo.isErr()) return Err(maybeThorTxInfo.unwrapErr())

    const thorTxInfo = maybeThorTxInfo.unwrap()

    const { data, router } = thorTxInfo

    return adapter.buildCustomTx({
      wallet,
      accountNumber,
      to: router,
      gasLimit,
      ...(gasPriceCryptoBaseUnit !== undefined
        ? { gasPrice: gasPriceCryptoBaseUnit }
        : { maxFeePerGas, maxPriorityFeePerGas }),
      value: isErc20Trade ? '0x0' : numberToHex(sellAmountCryptoBaseUnit),
      data,
    })
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[makeTradeTx]: error making trade tx', {
      code: SwapErrorType.BUILD_TRADE_FAILED,
      cause: e,
    })
  }
}
