import { Erc20Bridger, EthBridger, getL2Network } from '@arbitrum/sdk'
import type {
  L1ToL2TransactionRequest,
  L2ToL1TransactionRequest,
} from '@arbitrum/sdk/dist/lib/dataEntities/transactionRequest'
import { ethAssetId, ethChainId, fromAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { BigNumber } from 'ethers5'
import { getEthersV5Provider } from 'lib/ethersProviderSingleton'

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
  sellAmountIncludingProtocolFeesCryptoBaseUnit,
  sellAsset,
  sendAddress, // TODO(gomes): support L2 to L1 too, as well as ETH
  receiveAddress,
}: FetchArbitrumBridgeSwapInput): Promise<
  Omit<L1ToL2TransactionRequest | L2ToL1TransactionRequest, 'retryableData'>
> => {
  // TODO(gomes): don't hardcode me
  const l2Network = await getL2Network(42161)
  const isDeposit = sellAsset.chainId === ethChainId
  const isEthBridge = isDeposit ? sellAsset.assetId === ethAssetId : buyAsset.assetId === ethAssetId

  const bridger = isEthBridge ? new EthBridger(l2Network) : new Erc20Bridger(l2Network)

  const erc20L1Address = fromAssetId((isDeposit ? sellAsset : buyAsset).assetId).assetReference
  const l1Provider = getEthersV5Provider(sellAsset.chainId)
  const l2Provider = getEthersV5Provider(buyAsset.chainId)

  // TODO(gomes): handle deposits/withdraws, ERC20s/ETH
  // TODO(gomes): this no work when approval is needed and we'll need to construct Txs manually
  // "SDKs suck, sink with it" - Elon Musk, 2024
  const request = await (isDeposit
    ? bridger.getDepositRequest({
        amount: BigNumber.from(sellAmountIncludingProtocolFeesCryptoBaseUnit),
        erc20L1Address,
        l1Provider,
        l2Provider,
        from: sendAddress ?? '',
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
