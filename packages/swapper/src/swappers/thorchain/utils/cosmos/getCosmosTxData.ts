import { Asset } from '@shapeshiftoss/asset-service'
import { ChainId, cosmosAssetId } from '@shapeshiftoss/caip'
import { ChainAdapter, cosmos, thorchain } from '@shapeshiftoss/chain-adapters'
import { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { KnownChainIds } from '@shapeshiftoss/types'

import { SwapError, SwapErrorTypes, TradeQuote } from '../../../../api'
import type { ThorchainSwapperDeps } from '../../types'
import { getInboundAddressDataForChain } from '../getInboundAddressDataForChain'
import { getLimit } from '../getLimit/getLimit'
import { makeSwapMemo } from '../makeSwapMemo/makeSwapMemo'

type GetCosmosTxDataInput = {
  accountNumber: number
  destinationAddress: string
  deps: ThorchainSwapperDeps
  sellAmountCryptoBaseUnit: string
  sellAsset: Asset
  buyAsset: Asset
  slippageTolerance: string
  wallet: HDWallet
  quote: TradeQuote<KnownChainIds.CosmosMainnet>
  chainId: ChainId
  sellAdapter: ChainAdapter<KnownChainIds.CosmosMainnet>
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
      code: SwapErrorTypes.BUILD_TRADE_FAILED,
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
            code: SwapErrorTypes.BUILD_TRADE_FAILED,
            fn: 'buildTrade',
            details: { chainId: input.chainId },
          })
        return await (sellAdapter as unknown as cosmos.ChainAdapter).buildSendTransaction({
          accountNumber,
          value: sellAmountCryptoBaseUnit,
          wallet,
          to: vault,
          memo,
          chainSpecific: {
            gas: (quote as TradeQuote<KnownChainIds.CosmosMainnet>).feeData.chainSpecific
              .estimatedGas,
            fee: quote.feeData.networkFeeCryptoBaseUnit,
          },
        })
    }
  })()

  return builtTxResponse.txToSign
}
