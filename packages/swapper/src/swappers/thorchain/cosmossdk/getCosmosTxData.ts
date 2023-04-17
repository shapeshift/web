import type { Asset } from '@shapeshiftoss/asset-service'
import type { ChainId } from '@shapeshiftoss/caip'
import { cosmosAssetId } from '@shapeshiftoss/caip'
import type { CosmosSdkBaseAdapter, thorchain } from '@shapeshiftoss/chain-adapters'
import type { CosmosSignTx, HDWallet, ThorchainSignTx } from '@shapeshiftoss/hdwallet-core'
import { KnownChainIds } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { SwapErrorRight, TradeQuote } from '../../../api'
import { makeSwapErrorRight, SwapError, SwapErrorType } from '../../../api'
import type { ThorCosmosSdkSupportedChainId } from '../ThorchainSwapper'
import type { ThorchainSwapperDeps } from '../types'
import { getInboundAddressDataForChain } from '../utils/getInboundAddressDataForChain'
import { getLimit } from '../utils/getLimit/getLimit'
import { makeSwapMemo } from '../utils/makeSwapMemo/makeSwapMemo'

type GetCosmosTxDataInput = {
  accountNumber: number
  destinationAddress: string
  deps: ThorchainSwapperDeps
  sellAmountCryptoBaseUnit: string
  sellAsset: Asset
  buyAsset: Asset
  slippageTolerance: string
  wallet: HDWallet
  quote: TradeQuote<ThorCosmosSdkSupportedChainId>
  chainId: ChainId
  sellAdapter: CosmosSdkBaseAdapter<ThorCosmosSdkSupportedChainId>
}

export const getCosmosTxData = async (
  input: GetCosmosTxDataInput,
): Promise<Result<ThorchainSignTx | CosmosSignTx, SwapErrorRight>> => {
  const {
    accountNumber,
    deps,
    destinationAddress,
    sellAmountCryptoBaseUnit,
    sellAsset,
    buyAsset,
    slippageTolerance,
    quote,
    wallet,
    sellAdapter,
  } = input
  const fromThorAsset = sellAsset.chainId === KnownChainIds.ThorchainMainnet
  const gaiaAddressData = await getInboundAddressDataForChain(deps.daemonUrl, cosmosAssetId)
  const vault = gaiaAddressData?.address

  if (!vault && !fromThorAsset)
    throw new SwapError('[buildTrade]: no vault for chain', {
      code: SwapErrorType.BUILD_TRADE_FAILED,
      fn: 'buildTrade',
      details: { chainId: input.chainId },
    })

  const maybeLimit = await getLimit({
    buyAssetId: buyAsset.assetId,
    sellAmountCryptoBaseUnit,
    sellAsset,
    slippageTolerance,
    deps,
    buyAssetTradeFeeUsd: quote.feeData.buyAssetTradeFeeUsd,
    receiveAddress: destinationAddress,
  })

  if (maybeLimit.isErr()) return Err(maybeLimit.unwrapErr())

  const limit = maybeLimit.unwrap()
  const memo = makeSwapMemo({
    buyAssetId: buyAsset.assetId,
    destinationAddress,
    limit,
  })

  const maybeBuiltTxResponse = (() => {
    switch (true) {
      case fromThorAsset:
        return Ok(
          (sellAdapter as unknown as thorchain.ChainAdapter).buildDepositTransaction({
            accountNumber,
            value: sellAmountCryptoBaseUnit,
            wallet,
            memo,
            chainSpecific: {
              gas: quote.feeData.chainSpecific.estimatedGasCryptoBaseUnit,
              fee: quote.feeData.networkFeeCryptoBaseUnit,
            },
          }),
        )
      default:
        if (!vault)
          return Err(
            makeSwapErrorRight({
              message: '[buildTrade]: no vault for chain',
              code: SwapErrorType.BUILD_TRADE_FAILED,
              details: { chainId: input.chainId },
            }),
          )
        return Ok(
          (
            sellAdapter as unknown as CosmosSdkBaseAdapter<ThorCosmosSdkSupportedChainId>
          ).buildSendTransaction({
            accountNumber,
            value: sellAmountCryptoBaseUnit,
            wallet,
            to: vault,
            memo,
            chainSpecific: {
              gas: (quote as TradeQuote<ThorCosmosSdkSupportedChainId>).feeData.chainSpecific
                .estimatedGasCryptoBaseUnit,
              fee: quote.feeData.networkFeeCryptoBaseUnit,
            },
          }),
        )
    }
  })()

  if (maybeBuiltTxResponse.isErr()) return Err(maybeBuiltTxResponse.unwrapErr())
  const builtTxResponse = await maybeBuiltTxResponse.unwrap()

  return Ok(builtTxResponse.txToSign)
}
