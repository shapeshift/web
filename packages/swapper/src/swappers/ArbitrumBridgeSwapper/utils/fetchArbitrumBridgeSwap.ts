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

export type FetchArbitrumBridgeSwapInput<T extends 'price' | 'quote'> = {
  supportsEIP1559: boolean
  chainId: ChainId
  buyAsset: Asset
  receiveAddress: T extends 'price' ? string | undefined : string
  sellAmountIncludingProtocolFeesCryptoBaseUnit: string
  sellAsset: Asset
  sendAddress: T extends 'price' ? string | undefined : string
  assertGetEvmChainAdapter: (chainId: ChainId) => EvmChainAdapter
  priceOrQuote: T
}

// Broad estimate calculated by looking at a couple of different ERC-20 deposits
// https://github.com/OffchainLabs/arbitrum-token-bridge/blob/d17c88ef3eef3f4ffc61a04d34d50406039f045d/packages/arb-token-bridge-ui/src/util/TokenDepositUtils.ts#L45-L51
const fallbackErc20DepositGasLimit = bn(240_000)
// Broad estimate calculated by looking at a couple of different ERC-20 withdraws
// https://arbiscan.io/tx/0xf27939d382abcb0cce5c202489db457a6cc0d0dd8062468543400c3bf321148f
// https://arbiscan.io/tx/0xa4639374806ecc1e9de7beafbab2567c078483b84b708e862bfbd84fbc2fc1da
// https://arbiscan.io/tx/0xb6c3bce7999b2ae4bbe51a64bc7ab370d21ce9bf6807b805239acbf4c244a6db
// https://arbiscan.io/tx/0x878aa224a65d831c931192550b3d8fe114fa81660c1af8369c0e2ebea682dd5b
// https://arbiscan.io/tx/0xf293bd64f9dabddaffc4c8b97f2a602d4e9f77565f5d24018a0f70a95c1ecd38
const fallbackErc20WithdrawGasLimit = bn(350_000)
// Actually extremely accurate estimate calculated by looking at a couple of different ETH deposits - gas limit is around 100-100.05k
// https://etherscan.io/tx/0x31f7860fdb79c76d0301b9197f4e00ed2432170f1be38288f87838ce1184643a
// https://etherscan.io/tx/0x933c1b625824abeae6f15b4667e22caa3dc14be4929ae62310e2fbf1d39c7d8b
// https://etherscan.io/tx/0x695090931bb09e60fd378210a0c204ebb01cc137ff00e576074c79a41cc4fa80
// https://etherscan.io/tx/0xaaef3d2391e4b07f6f0a7524dadde735d4a9822efc2a611e5e8dd5e2708438cc
const fallbackEthDepositGasLimit = bn(100_000)
// Broad estimate calculated by looking at a couple of different ETH withdraws
const fallbackEthWithdrawGasLimit = bn(115_000)
// https://arbiscan.io/tx/0x641f1c0bacced5896e35aa505abe03076323e769e959aa0f7b9c9cd63d1741dd
// https://arbiscan.io/tx/0x060f503fa97b137d4298a6adb87cdae83030e1a43ee265b7d52e3b92493acd62
// https://arbiscan.io/tx/0x162efc48dffb5f7d8c6b454c6df42b4739edb70d2427a311538a0927c5ccdddc
// https://arbiscan.io/tx/0x51e76bc14ffa7a14d13732459ecd1c8fd3211bfb717ac2eb3de4d40fda8a9c4b

export const fetchArbitrumBridgeSwap = async <T extends 'price' | 'quote'>({
  chainId,
  buyAsset,
  sellAmountIncludingProtocolFeesCryptoBaseUnit,
  sellAsset,
  sendAddress,
  receiveAddress,
  supportsEIP1559,
  assertGetEvmChainAdapter,
  priceOrQuote,
}: FetchArbitrumBridgeSwapInput<T>): Promise<{
  request:
    | Omit<ParentToChildTransactionRequest | ChildToParentTransactionRequest, 'retryableData'>
    | undefined
  allowanceContract: string
  networkFeeCryptoBaseUnit: string
}> => {
  // TODO(gomes): when we actually split between TradeQuote and TradeRate in https://github.com/shapeshift/web/issues/7941,
  // this won't be an issue anymore

  if (priceOrQuote === 'quote' && !receiveAddress)
    throw new Error('receiveAddress is required for Arbitrum Bridge quotes')
  if (priceOrQuote === 'quote' && !sendAddress)
    throw new Error('sendAddress is required for Arbitrum Bridge quotes')

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

      const maybeRequest =
        priceOrQuote === 'quote'
          ? await bridger
              .getDepositToRequest({
                parentProvider,
                childProvider,
                amount: BigNumber.from(sellAmountIncludingProtocolFeesCryptoBaseUnit),
                from: sendAddress ?? '',
                destinationAddress: receiveAddress ?? '',
              })
              .catch(e => {
                console.error('Error getting ETH deposit request', e)
                return undefined
              })
          : undefined

      const networkFeeCryptoBaseUnit = await (async () => {
        // Fallback fees
        if (!maybeRequest) {
          const { average } = await adapter.getGasFeeData()
          const { gasPrice, maxFeePerGas } = average

          // eip1559 fees
          if (supportsEIP1559 && maxFeePerGas) {
            return fallbackEthDepositGasLimit.times(maxFeePerGas).toFixed()
          }

          // legacy fees
          return fallbackEthDepositGasLimit.times(gasPrice).toFixed()
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

      return { request: maybeRequest, networkFeeCryptoBaseUnit, allowanceContract: '0x0' }
    }
    case BRIDGE_TYPE.ETH_WITHDRAWAL: {
      const bridger = new EthBridger(l2Network)

      const maybeRequest =
        priceOrQuote === 'quote'
          ? await bridger
              .getWithdrawalRequest({
                amount: BigNumber.from(sellAmountIncludingProtocolFeesCryptoBaseUnit),
                from: sendAddress ?? '',
                destinationAddress: receiveAddress ?? '',
              })
              .catch(e => {
                console.error('Error getting ETH withdraw request', e)
                return undefined
              })
          : undefined

      const networkFeeCryptoBaseUnit = await (async () => {
        // Fallback fees
        if (!maybeRequest) {
          const { average } = await adapter.getGasFeeData()
          const { gasPrice, maxFeePerGas } = average

          // eip1559 fees
          if (supportsEIP1559 && maxFeePerGas) {
            return fallbackEthWithdrawGasLimit.times(maxFeePerGas).toFixed()
          }

          // legacy fees
          return fallbackEthWithdrawGasLimit.times(gasPrice).toFixed()
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

      return { request: maybeRequest, networkFeeCryptoBaseUnit, allowanceContract: '0x0' }
    }
    case BRIDGE_TYPE.ERC20_DEPOSIT: {
      const bridger = new Erc20Bridger(l2Network)
      const erc20ParentAddress = fromAssetId(sellAsset.assetId).assetReference
      const allowanceContract = await bridger.getParentGatewayAddress(
        erc20ParentAddress,
        parentProvider,
      )

      const maybeRequest =
        priceOrQuote === 'quote'
          ? await bridger
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
                console.error('Error getting ERC20 deposit request', e)
                return undefined
              })
          : undefined

      const networkFeeCryptoBaseUnit = await (async () => {
        // Fallback fees
        if (!maybeRequest) {
          const { average } = await adapter.getGasFeeData()
          const { gasPrice, maxFeePerGas } = average

          // eip1559 fees
          if (supportsEIP1559 && maxFeePerGas) {
            return fallbackErc20DepositGasLimit.times(maxFeePerGas).toFixed()
          }

          // legacy fees
          return fallbackErc20DepositGasLimit.times(gasPrice).toFixed()
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

      const maybeRequest =
        priceOrQuote === 'quote'
          ? await bridger
              .getWithdrawalRequest({
                amount: BigNumber.from(sellAmountIncludingProtocolFeesCryptoBaseUnit),
                erc20ParentAddress,
                from: sendAddress ?? '',
                destinationAddress: receiveAddress ?? '',
              })
              .catch(e => {
                console.error('Error getting ERC20 withdraw request', e)
                return undefined
              })
          : undefined

      const networkFeeCryptoBaseUnit = await (async () => {
        // Fallback fees
        if (!maybeRequest) {
          const { average } = await adapter.getGasFeeData()
          const { gasPrice, maxFeePerGas } = average

          // eip1559 fees
          if (supportsEIP1559 && maxFeePerGas) {
            return fallbackErc20WithdrawGasLimit.times(maxFeePerGas).toFixed()
          }

          // legacy fees
          return fallbackErc20WithdrawGasLimit.times(gasPrice).toFixed()
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
      return { request: maybeRequest, networkFeeCryptoBaseUnit, allowanceContract: '0x0' }
    }
    default:
      assertUnreachable(bridgeType)
  }
}
