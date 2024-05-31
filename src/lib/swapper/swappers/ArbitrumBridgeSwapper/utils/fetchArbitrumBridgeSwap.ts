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

export type FetchArbitrumBridgeSwapInput = {
  supportsEIP1559: boolean
  chainId: ChainId
  buyAsset: Asset
  receiveAddress: string
  sellAmountIncludingProtocolFeesCryptoBaseUnit: string
  sellAsset: Asset
  sendAddress: string
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
}: FetchArbitrumBridgeSwapInput): Promise<{
  request: Omit<L1ToL2TransactionRequest | L2ToL1TransactionRequest, 'retryableData'> | undefined
  allowanceContract: string
  networkFeeCryptoBaseUnit: string
}> => {
  const adapter = assertGetEvmChainAdapter(chainId)

  const l2Network = await getL2Network(arbitrum.id)
  const isDeposit = sellAsset.chainId === ethChainId
  const isEthBridge = isDeposit ? sellAsset.assetId === ethAssetId : buyAsset.assetId === ethAssetId

  const bridgeType = (() => {
    if (isDeposit) {
      return isEthBridge ? BRIDGE_TYPE.ETH_DEPOSIT : BRIDGE_TYPE.ERC20_DEPOSIT
    }
    return isEthBridge ? BRIDGE_TYPE.ETH_WITHDRAWAL : BRIDGE_TYPE.ERC20_WITHDRAWAL
  })()

  const l1Provider = getEthersV5Provider(KnownChainIds.EthereumMainnet)
  const l2Provider = getEthersV5Provider(KnownChainIds.ArbitrumMainnet)

  switch (bridgeType) {
    case BRIDGE_TYPE.ETH_DEPOSIT: {
      const bridger = new EthBridger(l2Network)

      const request = await bridger.getDepositToRequest({
        l1Provider,
        l2Provider,
        amount: BigNumber.from(sellAmountIncludingProtocolFeesCryptoBaseUnit),
        from: sendAddress ?? '',
        destinationAddress: receiveAddress,
      })

      const { networkFeeCryptoBaseUnit } = await getFees({
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

      const { networkFeeCryptoBaseUnit } = await getFees({
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
      const erc20L1Address = fromAssetId(sellAsset.assetId).assetReference
      const allowanceContract = await bridger.getL1GatewayAddress(erc20L1Address, l1Provider)

      const maybeRequest = await bridger
        .getDepositRequest({
          amount: BigNumber.from(sellAmountIncludingProtocolFeesCryptoBaseUnit),
          l1Provider,
          l2Provider,
          erc20L1Address,
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

      return { request: maybeRequest, networkFeeCryptoBaseUnit, allowanceContract }
    }
    case BRIDGE_TYPE.ERC20_WITHDRAWAL: {
      const bridger = new Erc20Bridger(l2Network)
      const erc20L1Address = fromAssetId(buyAsset.assetId).assetReference

      const request = await bridger.getWithdrawalRequest({
        amount: BigNumber.from(sellAmountIncludingProtocolFeesCryptoBaseUnit),
        // This isn't a typo - https://github.com/OffchainLabs/arbitrum-sdk/pull/474
        erc20l1Address: erc20L1Address,
        from: sendAddress ?? '',
        destinationAddress: receiveAddress,
      })

      const { networkFeeCryptoBaseUnit } = await getFees({
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
