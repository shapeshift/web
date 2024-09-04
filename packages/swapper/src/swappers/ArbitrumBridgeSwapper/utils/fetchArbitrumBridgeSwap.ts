import { Erc20Bridger, EthBridger, getArbitrumNetwork } from '@arbitrum/sdk'
import type {
  ChildToParentTransactionRequest,
  ParentToChildTransactionRequest,
} from '@arbitrum/sdk/dist/lib/dataEntities/transactionRequest'
import type { ChainId } from '@shapeshiftoss/caip'
import { ethAssetId, ethChainId, fromAssetId } from '@shapeshiftoss/caip'
import type { EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import { evm } from '@shapeshiftoss/chain-adapters'
import { getEthersV5Provider } from '@shapeshiftoss/contracts'
import { type Asset, KnownChainIds } from '@shapeshiftoss/types'
import { assertUnreachable, bn } from '@shapeshiftoss/utils'
import { BigNumber } from 'ethers5'
import { arbitrum } from 'viem/chains'

import { BRIDGE_TYPE } from '../types'

export type FetchArbitrumBridgeSwapInput = {
  supportsEIP1559: boolean
  chainId: ChainId
  buyAsset: Asset
  receiveAddress: string
  sellAmountIncludingProtocolFeesCryptoBaseUnit: string
  sellAsset: Asset
  sendAddress: string
  assertGetEvmChainAdapter: (chainId: ChainId) => EvmChainAdapter
}

// https://github.com/OffchainLabs/arbitrum-token-bridge/blob/d17c88ef3eef3f4ffc61a04d34d50406039f045d/packages/arb-token-bridge-ui/src/util/TokenDepositUtils.ts#L45-L51
// Use hardcoded gas estimate values
// Values set by looking at a couple of different ERC-20 deposits
const fallbackTokenGasLimit = bn(240_000)

export const fetchArbitrumBridgeSwap = async ({
  chainId,
  buyAsset,
  sellAmountIncludingProtocolFeesCryptoBaseUnit,
  sellAsset,
  sendAddress,
  receiveAddress,
  supportsEIP1559,
  assertGetEvmChainAdapter,
}: FetchArbitrumBridgeSwapInput): Promise<{
  request:
    | Omit<ParentToChildTransactionRequest | ChildToParentTransactionRequest, 'retryableData'>
    | undefined
  allowanceContract: string
  networkFeeCryptoBaseUnit: string
}> => {
  const adapter = assertGetEvmChainAdapter(chainId)

  const l2Network = await getArbitrumNetwork(arbitrum.id)
  const isDeposit = sellAsset.chainId === ethChainId
  const isEthBridge = isDeposit ? sellAsset.assetId === ethAssetId : buyAsset.assetId === ethAssetId

  const bridgeType = (() => {
    if (isDeposit) {
      return isEthBridge ? BRIDGE_TYPE.ETH_DEPOSIT : BRIDGE_TYPE.ERC20_DEPOSIT
    }
    return isEthBridge ? BRIDGE_TYPE.ETH_WITHDRAWAL : BRIDGE_TYPE.ERC20_WITHDRAWAL
  })()

  const parentProvider = getEthersV5Provider(KnownChainIds.EthereumMainnet)
  const childProvider = getEthersV5Provider(KnownChainIds.ArbitrumMainnet)

  switch (bridgeType) {
    case BRIDGE_TYPE.ETH_DEPOSIT: {
      const bridger = new EthBridger(l2Network)

      const request = await bridger.getDepositToRequest({
        parentProvider,
        childProvider,
        amount: BigNumber.from(sellAmountIncludingProtocolFeesCryptoBaseUnit),
        from: sendAddress ?? '',
        destinationAddress: receiveAddress,
      })

      const { networkFeeCryptoBaseUnit } = await evm.getFees({
        adapter,
        data: request.txRequest.data.toString(),
        to: request.txRequest.to,
        value: request.txRequest.value.toString(),
        from: request.txRequest.from,
        supportsEIP1559,
      })

      return { request, allowanceContract: '0x0', networkFeeCryptoBaseUnit }
    }
    case BRIDGE_TYPE.ETH_WITHDRAWAL: {
      const bridger = new EthBridger(l2Network)

      const request = await bridger.getWithdrawalRequest({
        amount: BigNumber.from(sellAmountIncludingProtocolFeesCryptoBaseUnit),
        from: sendAddress ?? '',
        destinationAddress: receiveAddress,
      })

      const { networkFeeCryptoBaseUnit } = await evm.getFees({
        adapter,
        data: request.txRequest.data.toString(),
        to: request.txRequest.to,
        value: request.txRequest.value.toString(),
        from: request.txRequest.from,
        supportsEIP1559,
      })

      return { request, allowanceContract: '0x0', networkFeeCryptoBaseUnit }
    }
    case BRIDGE_TYPE.ERC20_DEPOSIT: {
      const bridger = new Erc20Bridger(l2Network)
      const erc20ParentAddress = fromAssetId(sellAsset.assetId).assetReference
      const allowanceContract = await bridger.getParentGatewayAddress(
        erc20ParentAddress,
        parentProvider,
      )

      const maybeRequest = await bridger
        .getDepositRequest({
          amount: BigNumber.from(sellAmountIncludingProtocolFeesCryptoBaseUnit),
          parentProvider,
          childProvider,
          erc20ParentAddress,
          from: sendAddress ?? '',
          destinationAddress: receiveAddress,
          retryableGasOverrides: {
            // https://github.com/OffchainLabs/arbitrum-token-bridge/blob/d17c88ef3eef3f4ffc61a04d34d50406039f045d/packages/arb-token-bridge-ui/src/util/TokenDepositUtils.ts#L159
            // the gas limit may vary by about 20k due to SSTORE (zero vs nonzero)
            // the 30% gas limit increase should cover the difference
            gasLimit: { percentIncrease: BigNumber.from(30) },
          },
        })
        .catch(e => {
          console.error('Error getting deposit request', e)
          return undefined
        })

      const networkFeeCryptoBaseUnit = await (async () => {
        // Fallback fees
        if (!maybeRequest) {
          const { average } = await adapter.getGasFeeData()
          const { gasPrice, maxFeePerGas } = average

          // eip1559 fees
          if (supportsEIP1559 && maxFeePerGas) {
            return fallbackTokenGasLimit.times(maxFeePerGas).toFixed()
          }

          // legacy fees
          return fallbackTokenGasLimit.times(gasPrice).toFixed()
        }

        // Actual fees
        const feeData = await evm.getFees({
          adapter,
          data: maybeRequest.txRequest.data.toString(),
          to: maybeRequest.txRequest.to,
          value: maybeRequest.txRequest.value.toString(),
          from: maybeRequest.txRequest.from,
          supportsEIP1559,
        })

        return feeData.networkFeeCryptoBaseUnit
      })()

      return { request: maybeRequest, networkFeeCryptoBaseUnit, allowanceContract }
    }
    case BRIDGE_TYPE.ERC20_WITHDRAWAL: {
      const bridger = new Erc20Bridger(l2Network)
      const erc20ParentAddress = fromAssetId(buyAsset.assetId).assetReference

      const request = await bridger.getWithdrawalRequest({
        amount: BigNumber.from(sellAmountIncludingProtocolFeesCryptoBaseUnit),
        erc20ParentAddress,
        from: sendAddress ?? '',
        destinationAddress: receiveAddress,
      })

      const { networkFeeCryptoBaseUnit } = await evm.getFees({
        adapter,
        data: request.txRequest.data.toString(),
        to: request.txRequest.to,
        value: request.txRequest.value.toString(),
        from: request.txRequest.from,
        supportsEIP1559,
      })

      return { request, networkFeeCryptoBaseUnit, allowanceContract: '0x0' }
    }
    default:
      assertUnreachable(bridgeType)
  }
}
