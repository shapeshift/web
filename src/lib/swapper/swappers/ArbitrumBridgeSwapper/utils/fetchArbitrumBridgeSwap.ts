import { Erc20Bridger, EthBridger, getL2Network } from '@arbitrum/sdk'
import type {
  L1ToL2TransactionRequest,
  L2ToL1TransactionRequest,
} from '@arbitrum/sdk/dist/lib/dataEntities/transactionRequest'
import { ethAssetId, ethChainId, fromAssetId } from '@shapeshiftoss/caip'
import { type Asset, KnownChainIds } from '@shapeshiftoss/types'
import { BigNumber } from 'ethers5'
import { arbitrum } from 'viem/chains'
import { getEthersV5Provider } from 'lib/ethersProviderSingleton'

import { assertValidTrade } from './helpers'

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
  buyAsset,
  sellAmountIncludingProtocolFeesCryptoBaseUnit,
  sellAsset,
  sendAddress,
  receiveAddress,
}: FetchArbitrumBridgeSwapInput): Promise<
  Omit<L1ToL2TransactionRequest | L2ToL1TransactionRequest, 'retryableData'>
> => {
  const assertion = assertValidTrade({ buyAsset, sellAsset })
  if (assertion.isErr()) throw new Error(assertion.unwrapErr().message)

  const l2Network = await getL2Network(arbitrum.id)
  const isDeposit = sellAsset.chainId === ethChainId
  const isEthBridge = isDeposit ? sellAsset.assetId === ethAssetId : buyAsset.assetId === ethAssetId

  const bridger = isEthBridge ? new EthBridger(l2Network) : new Erc20Bridger(l2Network)

  const erc20L1Address = fromAssetId((isDeposit ? sellAsset : buyAsset).assetId).assetReference
  const l1Provider = getEthersV5Provider(KnownChainIds.EthereumMainnet)
  const l2Provider = getEthersV5Provider(KnownChainIds.ArbitrumMainnet)

  const request = await (isDeposit
    ? bridger.getDepositRequest({
        amount: BigNumber.from(sellAmountIncludingProtocolFeesCryptoBaseUnit),
        erc20L1Address,
        l1Provider,
        l2Provider,
        from: sendAddress ?? '',
        destinationAddress: receiveAddress ?? '',
      })
    : bridger.getWithdrawalRequest({
        amount: BigNumber.from(sellAmountIncludingProtocolFeesCryptoBaseUnit),
        // This isn't a typo - https://github.com/OffchainLabs/arbitrum-sdk/pull/474
        erc20l1Address: erc20L1Address,
        destinationAddress: receiveAddress ?? '',
        from: sendAddress ?? '',
      }))

  return request
}
