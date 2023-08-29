import type { ChainId } from '@shapeshiftoss/caip'
import { cosmosAssetId } from '@shapeshiftoss/caip'
import type { CosmosSdkBaseAdapter, thorchain } from '@shapeshiftoss/chain-adapters'
import type { CosmosSignTx, ThorchainSignTx } from '@shapeshiftoss/hdwallet-core'
import { KnownChainIds } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { getConfig } from 'config'
import type { Asset } from 'lib/asset-service'
import type { ThorCosmosSdkSupportedChainId } from 'lib/swapper/swappers/ThorchainSwapper/types'
import { getInboundAddressDataForChain } from 'lib/swapper/swappers/ThorchainSwapper/utils/getInboundAddressDataForChain'
import type { CosmosSdkFeeData, SwapErrorRight, TradeQuote } from 'lib/swapper/types'
import { SwapErrorType } from 'lib/swapper/types'
import { makeSwapErrorRight } from 'lib/swapper/utils'

type GetCosmosTxDataInput = {
  accountNumber: number
  destinationAddress: string
  sellAmountCryptoBaseUnit: string
  sellAsset: Asset
  buyAsset: Asset
  slippageDecimalPercentage: string
  from: string
  quote: TradeQuote
  chainId: ChainId
  sellAdapter: CosmosSdkBaseAdapter<ThorCosmosSdkSupportedChainId>
  affiliateBps: string
  memo: string
}

export const getCosmosTxData = async (
  input: GetCosmosTxDataInput,
): Promise<Result<ThorchainSignTx | CosmosSignTx, SwapErrorRight>> => {
  const { accountNumber, sellAmountCryptoBaseUnit, sellAsset, quote, from, sellAdapter, memo } =
    input
  const fromThorAsset = sellAsset.chainId === KnownChainIds.ThorchainMainnet
  const daemonUrl = getConfig().REACT_APP_THORCHAIN_NODE_URL
  const maybeVault = await (async () => {
    if (fromThorAsset) return Ok(undefined)
    const maybeGaiaAddressData = await getInboundAddressDataForChain(daemonUrl, cosmosAssetId)
    if (maybeGaiaAddressData.isErr()) return Err(maybeGaiaAddressData.unwrapErr())
    const gaiaAddressData = maybeGaiaAddressData.unwrap()
    return Ok(gaiaAddressData.address)
  })()

  const vault = maybeVault.unwrap()

  if (!vault && !fromThorAsset)
    return Err(
      makeSwapErrorRight({
        message: '[buildTrade]: no vault for chain',
        code: SwapErrorType.BUILD_TRADE_FAILED,
        details: { chainId: input.chainId },
      }),
    )

  const maybeBuiltTxResponse = (() => {
    switch (true) {
      case fromThorAsset:
        return Ok(
          (sellAdapter as unknown as thorchain.ChainAdapter).buildDepositTransaction({
            from,
            accountNumber,
            value: sellAmountCryptoBaseUnit,
            memo,
            chainSpecific: {
              gas: (quote.steps[0].feeData.chainSpecific as CosmosSdkFeeData)
                .estimatedGasCryptoBaseUnit,
              fee: quote.steps[0].feeData.networkFeeCryptoBaseUnit ?? '0',
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
          ).buildSendApiTransaction({
            accountNumber,
            value: sellAmountCryptoBaseUnit,
            from,
            to: vault,
            memo,
            chainSpecific: {
              gas: (quote.steps[0].feeData.chainSpecific as CosmosSdkFeeData)
                .estimatedGasCryptoBaseUnit,
              fee: quote.steps[0].feeData.networkFeeCryptoBaseUnit ?? '0',
            },
          }),
        )
    }
  })()

  if (maybeBuiltTxResponse.isErr()) return Err(maybeBuiltTxResponse.unwrapErr())
  const builtTxResponse = await maybeBuiltTxResponse.unwrap()

  return Ok(builtTxResponse.txToSign)
}
