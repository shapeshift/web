import { Asset } from '@shapeshiftoss/asset-service'
import { fromAssetId } from '@shapeshiftoss/caip'
import { ethereum } from '@shapeshiftoss/chain-adapters'
import { ETHSignTx, HDWallet } from '@shapeshiftoss/hdwallet-core'
import { BIP44Params } from '@shapeshiftoss/types'
import { numberToHex } from 'web3-utils'

import { SwapError, SwapErrorTypes } from '../../../../api'
import { ThorchainSwapperDeps } from '../../types'
import { getThorTxInfo } from '../ethereum/utils/getThorTxData'

export const makeTradeTx = async ({
  wallet,
  bip44Params,
  sellAmountCryptoPrecision,
  buyAsset,
  sellAsset,
  destinationAddress,
  adapter,
  maxFeePerGas,
  maxPriorityFeePerGas,
  gasPrice,
  slippageTolerance,
  deps,
  gasLimit,
  buyAssetTradeFeeUsd,
}: {
  wallet: HDWallet
  bip44Params: BIP44Params
  sellAmountCryptoPrecision: string
  buyAsset: Asset
  sellAsset: Asset
  destinationAddress: string
  adapter: ethereum.ChainAdapter
  slippageTolerance: string
  deps: ThorchainSwapperDeps
  gasLimit: string
  buyAssetTradeFeeUsd: string
} & (
  | {
      gasPrice: string
      maxFeePerGas?: never
      maxPriorityFeePerGas?: never
    }
  | {
      gasPrice?: never
      maxFeePerGas: string
      maxPriorityFeePerGas: string
    }
)): Promise<{
  txToSign: ETHSignTx
}> => {
  try {
    const { assetNamespace } = fromAssetId(sellAsset.assetId)

    const isErc20Trade = assetNamespace === 'erc20'

    const { data, router } = await getThorTxInfo({
      deps,
      sellAsset,
      buyAsset,
      sellAmountCryptoPrecision,
      slippageTolerance,
      destinationAddress,
      buyAssetTradeFeeUsd,
    })

    return adapter.buildCustomTx({
      wallet,
      bip44Params,
      to: router,
      gasLimit,
      ...(gasPrice !== undefined
        ? {
            gasPrice,
          }
        : {
            maxFeePerGas,
            maxPriorityFeePerGas,
          }),
      value: isErc20Trade ? '0x0' : numberToHex(sellAmountCryptoPrecision),
      data,
    })
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[makeTradeTx]: error making trade tx', {
      code: SwapErrorTypes.BUILD_TRADE_FAILED,
      cause: e,
    })
  }
}
