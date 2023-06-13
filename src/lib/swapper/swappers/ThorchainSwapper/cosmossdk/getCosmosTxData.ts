import type { ChainId } from '@shapeshiftoss/caip'
import { cosmosAssetId } from '@shapeshiftoss/caip'
import type { CosmosSdkBaseAdapter, thorchain } from '@shapeshiftoss/chain-adapters'
import type { CosmosSignTx, HDWallet, ThorchainSignTx } from '@shapeshiftoss/hdwallet-core'
import { KnownChainIds } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { getConfig } from 'config'
import type { Asset } from 'lib/asset-service'
import type { SwapErrorRight, TradeQuote } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapErrorType } from 'lib/swapper/api'
import type { ThorCosmosSdkSupportedChainId } from 'lib/swapper/swappers/ThorchainSwapper/ThorchainSwapper'
import { getInboundAddressDataForChain } from 'lib/swapper/swappers/ThorchainSwapper/utils/getInboundAddressDataForChain'
import { getLimit } from 'lib/swapper/swappers/ThorchainSwapper/utils/getLimit/getLimit'
import { makeSwapMemo } from 'lib/swapper/swappers/ThorchainSwapper/utils/makeSwapMemo/makeSwapMemo'

type GetCosmosTxDataInput = {
  accountNumber: number
  destinationAddress: string
  sellAmountCryptoBaseUnit: string
  sellAsset: Asset
  buyAsset: Asset
  slippageTolerance: string
  wallet: HDWallet
  quote: TradeQuote<ThorCosmosSdkSupportedChainId>
  chainId: ChainId
  sellAdapter: CosmosSdkBaseAdapter<ThorCosmosSdkSupportedChainId>
  affiliateBps: string
  buyAssetUsdRate: string
  feeAssetUsdRate: string
}

export const getCosmosTxData = async (
  input: GetCosmosTxDataInput,
): Promise<Result<ThorchainSignTx | CosmosSignTx, SwapErrorRight>> => {
  const {
    accountNumber,
    destinationAddress,
    sellAmountCryptoBaseUnit,
    sellAsset,
    buyAsset,
    slippageTolerance,
    quote,
    wallet,
    sellAdapter,
    affiliateBps,
    buyAssetUsdRate,
    feeAssetUsdRate,
  } = input
  const fromThorAsset = sellAsset.chainId === KnownChainIds.ThorchainMainnet
  const daemonUrl = getConfig().REACT_APP_THORCHAIN_NODE_URL
  const maybeGaiaAddressData = await getInboundAddressDataForChain(daemonUrl, cosmosAssetId)
  if (maybeGaiaAddressData.isErr()) return Err(maybeGaiaAddressData.unwrapErr())
  const gaiaAddressData = maybeGaiaAddressData.unwrap()
  const vault = gaiaAddressData.address

  if (!vault && !fromThorAsset)
    return Err(
      makeSwapErrorRight({
        message: '[buildTrade]: no vault for chain',
        code: SwapErrorType.BUILD_TRADE_FAILED,
        details: { chainId: input.chainId },
      }),
    )

  const maybeLimit = await getLimit({
    buyAsset,
    sellAmountCryptoBaseUnit,
    sellAsset,
    slippageTolerance,
    protocolFees: quote.steps[0].feeData.protocolFees,
    receiveAddress: destinationAddress,
    affiliateBps,
    buyAssetUsdRate,
    feeAssetUsdRate,
  })

  if (maybeLimit.isErr()) return Err(maybeLimit.unwrapErr())

  const limit = maybeLimit.unwrap()
  const memo = makeSwapMemo({
    buyAssetId: buyAsset.assetId,
    destinationAddress,
    limit,
    affiliateBps,
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
              gas: quote.steps[0].feeData.chainSpecific.estimatedGasCryptoBaseUnit,
              fee: quote.steps[0].feeData.networkFeeCryptoBaseUnit,
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
              gas: (quote as TradeQuote<ThorCosmosSdkSupportedChainId>).steps[0].feeData
                .chainSpecific.estimatedGasCryptoBaseUnit,
              fee: quote.steps[0].feeData.networkFeeCryptoBaseUnit,
            },
          }),
        )
    }
  })()

  if (maybeBuiltTxResponse.isErr()) return Err(maybeBuiltTxResponse.unwrapErr())
  const builtTxResponse = await maybeBuiltTxResponse.unwrap()

  return Ok(builtTxResponse.txToSign)
}
