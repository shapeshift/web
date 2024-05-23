import { Erc20Bridger, EthBridger, getL2Network } from '@arbitrum/sdk'
import type { L1ToL2TransactionRequest } from '@arbitrum/sdk/dist/lib/dataEntities/transactionRequest'
import { ethAssetId, fromAssetId, fromChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { getConfig } from 'config'
import { BigNumber } from 'ethers5'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { getEthersV5Provider } from 'lib/ethersProviderSingleton'
import { convertBasisPointsToPercentage } from 'state/slices/tradeQuoteSlice/utils'

import { getTreasuryAddressFromChainId } from '../../utils/helpers/helpers'
import { getOneInchTokenAddress } from './helpers'
import { oneInchService } from './oneInchService'
import type { OneInchSwapApiInput, OneInchSwapResponse } from './types'

export type FetchArbitrumBridgeSwapInput = {
  affiliateBps: string
  buyAsset: Asset
  receiveAddress: string
  sellAmountIncludingProtocolFeesCryptoBaseUnit: string
  sellAsset: Asset
  maximumSlippageDecimalPercentage: string
  sendAddress: string
}

export const fetchArbitrumBridgeSwap = async ({
  affiliateBps,
  buyAsset,
  receiveAddress,
  sellAmountIncludingProtocolFeesCryptoBaseUnit,
  sellAsset,
  maximumSlippageDecimalPercentage,
  sendAddress, // TODO(gomes): support L2 to L1 too, as well as ETH
}: FetchArbitrumBridgeSwapInput): Promise<Omit<L1ToL2TransactionRequest, 'retryableData'>> => {
  // TODO(gomes): don't hardcode me
  const l2Network = await getL2Network(42161)
  const isEthBridge = sellAsset.assetId === ethAssetId

  const bridger = isEthBridge ? new EthBridger(l2Network) : new Erc20Bridger(l2Network)

  const erc20L1Address = fromAssetId(sellAsset.assetId).assetReference
  const l1Provider = getEthersV5Provider(sellAsset.chainId)
  const l2Provider = getEthersV5Provider(buyAsset.chainId)

  // TODO(gomes): handle deposits/withdraws, ERC20s/ETH
  // TODO(gomes): this no work when approval is needed and we'll need to construct Txs manually
  // "SDKs suck, sink with it" - Elon Musk, 2024
  const request = await bridger.getDepositRequest({
    amount: BigNumber.from(sellAmountIncludingProtocolFeesCryptoBaseUnit),
    erc20L1Address,
    l1Provider,
    l2Provider,
    from: sendAddress ?? '',
  })

  return request
}
