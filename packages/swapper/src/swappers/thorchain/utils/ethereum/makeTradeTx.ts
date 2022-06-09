import { fromAssetId } from '@shapeshiftoss/caip'
import { ethereum } from '@shapeshiftoss/chain-adapters'
import { ETHSignTx, HDWallet } from '@shapeshiftoss/hdwallet-core'
import { Asset, BIP44Params } from '@shapeshiftoss/types'

import { SwapError, SwapErrorTypes } from '../../../../api'
import { ThorchainSwapperDeps } from '../../types'
import { getThorTxInfo } from '../ethereum/utils/getThorTxData'

export const makeTradeTx = async ({
  wallet,
  bip44Params,
  sellAmount,
  buyAsset,
  sellAsset,
  destinationAddress,
  adapter,
  maxFeePerGas,
  maxPriorityFeePerGas,
  slippageTolerance,
  deps,
  gasLimit
}: {
  wallet: HDWallet
  bip44Params: BIP44Params
  sellAmount: string
  buyAsset: Asset
  sellAsset: Asset
  destinationAddress: string
  adapter: ethereum.ChainAdapter
  maxFeePerGas: string
  maxPriorityFeePerGas: string
  slippageTolerance: string
  deps: ThorchainSwapperDeps
  gasLimit: string
}): Promise<{
  txToSign: ETHSignTx
}> => {
  try {
    const { assetReference } = fromAssetId(sellAsset.assetId)

    const isErc20Trade = assetReference.startsWith('0x')

    const { data, router } = await getThorTxInfo({
      deps,
      sellAsset,
      buyAsset,
      sellAmount,
      slippageTolerance,
      destinationAddress,
      isErc20Trade
    })

    return adapter.buildCustomTx({
      wallet,
      bip44Params,
      to: router,
      gasLimit,
      maxFeePerGas,
      maxPriorityFeePerGas,
      value: isErc20Trade ? '0' : sellAmount,
      data
    })
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[makeTradeTx]: error making trade tx', {
      code: SwapErrorTypes.BUILD_TRADE_FAILED,
      cause: e
    })
  }
}
