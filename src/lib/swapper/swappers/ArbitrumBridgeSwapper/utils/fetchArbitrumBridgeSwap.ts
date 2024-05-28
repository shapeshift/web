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
import { assertUnreachable } from 'lib/utils'

import { BRIDGE_TYPE } from '../types'
import { assertValidTrade } from './helpers'

export type FetchArbitrumBridgeSwapInput = {
  buyAsset: Asset
  receiveAddress: string
  sellAmountIncludingProtocolFeesCryptoBaseUnit: string
  sellAsset: Asset
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
  const assertion = await assertValidTrade({ buyAsset, sellAsset })
  if (assertion.isErr()) throw new Error(assertion.unwrapErr().message)

  const l2Network = await getL2Network(arbitrum.id)
  const isDeposit = sellAsset.chainId === ethChainId
  const isEthBridge = isDeposit ? sellAsset.assetId === ethAssetId : buyAsset.assetId === ethAssetId
  const bridgeType = isEthBridge ? BRIDGE_TYPE.ETH : BRIDGE_TYPE.ERC20

  const l1Provider = getEthersV5Provider(KnownChainIds.EthereumMainnet)
  const l2Provider = getEthersV5Provider(KnownChainIds.ArbitrumMainnet)

  switch (bridgeType) {
    case BRIDGE_TYPE.ETH: {
      const bridger = new EthBridger(l2Network)

      const request = await (isDeposit
        ? bridger.getDepositToRequest({
            l1Provider,
            l2Provider,
            amount: BigNumber.from(sellAmountIncludingProtocolFeesCryptoBaseUnit),
            from: sendAddress ?? '',
            destinationAddress: receiveAddress ?? '',
          })
        : bridger.getWithdrawalRequest({
            amount: BigNumber.from(sellAmountIncludingProtocolFeesCryptoBaseUnit),
            destinationAddress: receiveAddress ?? '',
            from: sendAddress ?? '',
          }))

      return request
    }
    case BRIDGE_TYPE.ERC20: {
      const bridger = new Erc20Bridger(l2Network)

      const erc20L1Address = fromAssetId((isDeposit ? sellAsset : buyAsset).assetId).assetReference

      const request = await (isDeposit
        ? bridger.getDepositRequest({
            amount: BigNumber.from(sellAmountIncludingProtocolFeesCryptoBaseUnit),
            erc20L1Address,
            l1Provider,
            l2Provider,
            from: sendAddress ?? '',
            destinationAddress: receiveAddress ?? '',
            retryableGasOverrides: {
              // https://github.com/OffchainLabs/arbitrum-token-bridge/blob/d17c88ef3eef3f4ffc61a04d34d50406039f045d/packages/arb-token-bridge-ui/src/util/TokenDepositUtils.ts#L159
              // the gas limit may vary by about 20k due to SSTORE (zero vs nonzero)
              // the 30% gas limit increase should cover the difference
              gasLimit: { percentIncrease: BigNumber.from(30) },
            },
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
    default:
      assertUnreachable(bridgeType)
  }
}
