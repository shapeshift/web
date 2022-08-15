import { Asset } from '@shapeshiftoss/asset-service'
import { ChainId } from '@shapeshiftoss/caip'
import { ChainAdapter, cosmos } from '@shapeshiftoss/chain-adapters'
import { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { KnownChainIds } from '@shapeshiftoss/types'

import { SwapError, SwapErrorTypes, TradeQuote } from '../../../../api'
import { InboundResponse, ThorchainSwapperDeps } from '../../types'
import { getLimit } from '../getLimit/getLimit'
import { makeSwapMemo } from '../makeSwapMemo/makeSwapMemo'
import { thorService } from '../thorService'

export const cosmosTxData = async (input: {
  destinationAddress: string
  deps: ThorchainSwapperDeps
  sellAmount: string
  sellAsset: Asset
  buyAsset: Asset
  slippageTolerance: string
  wallet: HDWallet
  quote: TradeQuote<KnownChainIds.CosmosMainnet>
  chainId: ChainId
  sellAdapter: ChainAdapter<KnownChainIds.CosmosMainnet>
}) => {
  const {
    deps,
    destinationAddress,
    sellAmount,
    sellAsset,
    buyAsset,
    slippageTolerance,
    quote,
    wallet,
    sellAdapter,
  } = input
  const { data: inboundAddresses } = await thorService.get<InboundResponse[]>(
    `${deps.midgardUrl}/thorchain/inbound_addresses`,
  )
  const atomInboundAddresses = inboundAddresses.find((inbound) => inbound.chain === 'GAIA')
  const vault = atomInboundAddresses?.address

  if (!vault)
    throw new SwapError('[buildTrade]: no vault for chain', {
      code: SwapErrorTypes.BUILD_TRADE_FAILED,
      fn: 'buildTrade',
      details: { chainId: input.chainId },
    })

  const limit = await getLimit({
    buyAssetId: buyAsset.assetId,
    destinationAddress,
    sellAmount,
    sellAsset,
    buyAsset,
    slippageTolerance,
    deps,
    tradeFee: quote.feeData.tradeFee,
  })

  const memo = makeSwapMemo({
    buyAssetId: buyAsset.assetId,
    destinationAddress,
    limit,
  })

  const buildTxResponse = await (
    sellAdapter as unknown as cosmos.ChainAdapter
  ).buildSendTransaction({
    value: sellAmount,
    wallet,
    to: vault,
    memo,
    chainSpecific: {
      gas: (quote as TradeQuote<KnownChainIds.CosmosMainnet>).feeData.chainSpecific.estimatedGas,
      fee: quote.feeData.fee,
    },
  })

  return buildTxResponse.txToSign
}
