import { Erc20Bridger, EthBridger, getL2Network } from '@arbitrum/sdk'
import type {
  L1ToL2TransactionRequest,
  L2ToL1TransactionRequest,
} from '@arbitrum/sdk/dist/lib/dataEntities/transactionRequest'
import type { ChainId } from '@shapeshiftoss/caip'
import { ethAssetId, ethChainId, fromAssetId } from '@shapeshiftoss/caip'
import { type Asset, KnownChainIds } from '@shapeshiftoss/types'
import { BigNumber } from 'ethers5'
import { arbitrum } from 'viem/chains'
import { bn } from 'lib/bignumber/bignumber'
import { getEthersV5Provider } from 'lib/ethersProviderSingleton'
import { assertUnreachable } from 'lib/utils'
import { assertGetEvmChainAdapter, getFees } from 'lib/utils/evm'

import { BRIDGE_TYPE } from '../types'
import { assertValidTrade } from './helpers'

export type FetchArbitrumBridgeSwapInput = {
  supportsEIP1559: boolean
  chainId: ChainId
  buyAsset: Asset
  receiveAddress: string
  sellAmountIncludingProtocolFeesCryptoBaseUnit: string
  sellAsset: Asset
  sendAddress: string
}

const fetchTokenFallbackGasEstimates = () =>
  // https://github.com/OffchainLabs/arbitrum-token-bridge/blob/d17c88ef3eef3f4ffc61a04d34d50406039f045d/packages/arb-token-bridge-ui/src/util/TokenDepositUtils.ts#L45-L51
  // Use hardcoded gas estimate values
  // Values set by looking at a couple of different ERC-20 deposits
  bn(240_000)

export const fetchArbitrumBridgeSwap = async ({
  chainId,
  buyAsset,
  sellAmountIncludingProtocolFeesCryptoBaseUnit,
  sellAsset,
  sendAddress,
  receiveAddress,
  supportsEIP1559,
}: FetchArbitrumBridgeSwapInput): Promise<{
  request: Omit<L1ToL2TransactionRequest | L2ToL1TransactionRequest, 'retryableData'> | undefined
  allowanceContract: string
  networkFeeCryptoBaseUnit: string
}> => {
  const assertion = await assertValidTrade({ buyAsset, sellAsset })
  if (assertion.isErr()) throw new Error(assertion.unwrapErr().message)

  const adapter = assertGetEvmChainAdapter(chainId)

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

      const networkFeeCryptoBaseUnit = await (async () => {
        const feeData = await getFees({
          adapter,
          data: request.txRequest.data.toString(),
          to: request.txRequest.to,
          value: request.txRequest.value.toString(),
          from: request.txRequest.from,
          supportsEIP1559,
        })

        return feeData.networkFeeCryptoBaseUnit
      })()

      return { request, allowanceContract: '0x0', networkFeeCryptoBaseUnit }
    }
    case BRIDGE_TYPE.ERC20: {
      const bridger = new Erc20Bridger(l2Network)

      const erc20L1Address = fromAssetId((isDeposit ? sellAsset : buyAsset).assetId).assetReference

      if (isDeposit) {
        const allowanceContract = await bridger.getL1GatewayAddress(erc20L1Address, l1Provider)
        const maybeRequest = await bridger
          .getDepositRequest({
            amount: BigNumber.from(sellAmountIncludingProtocolFeesCryptoBaseUnit),
            l1Provider,
            l2Provider,
            erc20L1Address,
            destinationAddress: receiveAddress ?? '',
            from: sendAddress ?? '',
          })
          .catch(e => {
            console.error('Error getting withdrawal request', e)
            return undefined
          })

        const networkFeeCryptoBaseUnit = await (async () => {
          // Fallback fees
          if (!maybeRequest) {
            const estimatedParentChainGas = fetchTokenFallbackGasEstimates()
            const { average } = await adapter.getGasFeeData()
            return estimatedParentChainGas.times(average.gasPrice).toString()
          }
          // Actual fees

          const feeData = await getFees({
            adapter,
            data: maybeRequest.txRequest.data.toString(),
            to: maybeRequest.txRequest.to,
            value: maybeRequest.txRequest.value.toString(),
            from: maybeRequest.txRequest.from,
            supportsEIP1559,
          })

          return feeData.networkFeeCryptoBaseUnit
        })()

        return {
          request: maybeRequest,
          networkFeeCryptoBaseUnit,
          allowanceContract,
        }
      }

      const request = await bridger.getWithdrawalRequest({
        amount: BigNumber.from(sellAmountIncludingProtocolFeesCryptoBaseUnit),
        // This isn't a typo - https://github.com/OffchainLabs/arbitrum-sdk/pull/474
        erc20l1Address: erc20L1Address,
        destinationAddress: receiveAddress ?? '',
        from: sendAddress ?? '',
      })

      const networkFeeCryptoBaseUnit = await (async () => {
        const feeData = await getFees({
          adapter,
          data: request.txRequest.data.toString(),
          to: request.txRequest.to,
          value: request.txRequest.value.toString(),
          from: request.txRequest.from,
          supportsEIP1559,
        })

        return feeData.networkFeeCryptoBaseUnit
      })()

      return { request, networkFeeCryptoBaseUnit, allowanceContract: '0x0' }
    }
    default:
      assertUnreachable(bridgeType)
  }
}
