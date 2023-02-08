import { Asset } from '@shapeshiftoss/asset-service'
import { ChainId, cosmosAssetId } from '@shapeshiftoss/caip'
import { CosmosSdkBaseAdapter, thorchain } from '@shapeshiftoss/chain-adapters'
import { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { KnownChainIds } from '@shapeshiftoss/types'

import { SwapError, SwapErrorType, TradeQuote } from '../../../api'
import { ThorCosmosSdkSupportedChainId } from '../ThorchainSwapper'
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

export const getCosmosTxData = async (input: GetCosmosTxDataInput) => {
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
  const fromThorAsset = sellAsset.chainId == KnownChainIds.ThorchainMainnet
  const gaiaAddressData = await getInboundAddressDataForChain(deps.daemonUrl, cosmosAssetId)
  const vault = gaiaAddressData?.address

  if (!vault && !fromThorAsset)
    throw new SwapError('[buildTrade]: no vault for chain', {
      code: SwapErrorType.BUILD_TRADE_FAILED,
      fn: 'buildTrade',
      details: { chainId: input.chainId },
    })

  const limit = await getLimit({
    buyAssetId: buyAsset.assetId,
    sellAmountCryptoBaseUnit,
    sellAsset,
    slippageTolerance,
    deps,
    buyAssetTradeFeeUsd: quote.feeData.buyAssetTradeFeeUsd,
  })

  const memo = makeSwapMemo({
    buyAssetId: buyAsset.assetId,
    destinationAddress,
    limit,
  })

  const builtTxResponse = await (async () => {
    switch (true) {
      case fromThorAsset:
        return await (sellAdapter as unknown as thorchain.ChainAdapter).buildDepositTransaction({
          accountNumber,
          value: sellAmountCryptoBaseUnit,
          wallet,
          memo,
          chainSpecific: {
            gas: quote.feeData.chainSpecific.estimatedGas,
            fee: quote.feeData.networkFeeCryptoBaseUnit,
          },
        })
      default:
        if (!vault)
          throw new SwapError('[buildTrade]: no vault for chain', {
            code: SwapErrorType.BUILD_TRADE_FAILED,
            fn: 'buildTrade',
            details: { chainId: input.chainId },
          })
        return await (
          sellAdapter as unknown as CosmosSdkBaseAdapter<ThorCosmosSdkSupportedChainId>
        ).buildSendTransaction({
          accountNumber,
          value: sellAmountCryptoBaseUnit,
          wallet,
          to: vault,
          memo,
          chainSpecific: {
            gas: (quote as TradeQuote<ThorCosmosSdkSupportedChainId>).feeData.chainSpecific
              .estimatedGas,
            fee: quote.feeData.networkFeeCryptoBaseUnit,
          },
        })
    }
  })()

  return builtTxResponse.txToSign
}
