import { Erc20Bridger, EthBridger, getArbitrumNetwork } from '@arbitrum/sdk'
import type {
  ChildToParentTransactionRequest,
  ParentToChildTransactionRequest,
} from '@arbitrum/sdk/dist/lib/dataEntities/transactionRequest'
import type { ChainId } from '@shapeshiftoss/caip'
import { ethAssetId, ethChainId, fromAssetId } from '@shapeshiftoss/caip'
import type { EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import { getEthersV5Provider } from '@shapeshiftoss/contracts'
import type { Asset } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import { assertUnreachable } from '@shapeshiftoss/utils'
import { BigNumber } from 'ethers5'
import { arbitrum } from 'viem/chains'

import { BRIDGE_TYPE } from '../types'
import { getNetworkFeeOrFallbackCryptoBaseUnit } from './helpers'

type FetchArbitrumBridgeSwapInput<T extends 'rate' | 'quote'> = {
  supportsEIP1559: boolean
  chainId: ChainId
  buyAsset: Asset
  receiveAddress: T extends 'rate' ? string | undefined : string
  sellAmountIncludingProtocolFeesCryptoBaseUnit: string
  sellAsset: Asset
  sendAddress: T extends 'rate' ? undefined : string
  assertGetEvmChainAdapter: (chainId: ChainId) => EvmChainAdapter
  quoteOrRate: T
}

type FetchArbitrumBridgePriceInput = {
  supportsEIP1559: false
  chainId: ChainId
  buyAsset: Asset
  receiveAddress: string | undefined
  sellAmountIncludingProtocolFeesCryptoBaseUnit: string
  sellAsset: Asset
  sendAddress: undefined
  assertGetEvmChainAdapter: (chainId: ChainId) => EvmChainAdapter
}

export type FetchArbitrumBridgeQuoteInput = {
  supportsEIP1559: boolean
  chainId: ChainId
  buyAsset: Asset
  receiveAddress: string
  sellAmountIncludingProtocolFeesCryptoBaseUnit: string
  sellAsset: Asset
  sendAddress: string
  assertGetEvmChainAdapter: (chainId: ChainId) => EvmChainAdapter
}

const fetchArbitrumBridgeSwap = async <T extends 'quote' | 'rate'>({
  chainId,
  buyAsset,
  sellAmountIncludingProtocolFeesCryptoBaseUnit,
  sellAsset,
  sendAddress,
  receiveAddress,
  supportsEIP1559,
  assertGetEvmChainAdapter,
  quoteOrRate,
}: FetchArbitrumBridgeSwapInput<T>): Promise<{
  request:
    | Omit<ParentToChildTransactionRequest | ChildToParentTransactionRequest, 'retryableData'>
    | undefined
  allowanceContract: string
  networkFeeCryptoBaseUnit: string
}> => {
  if (quoteOrRate === 'quote' && !receiveAddress)
    throw new Error('receiveAddress is required for Arbitrum Bridge quotes')
  if (quoteOrRate === 'quote' && !sendAddress)
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
        quoteOrRate === 'quote'
          ? await bridger
              .getDepositToRequest({
                parentProvider,
                childProvider,
                amount: BigNumber.from(sellAmountIncludingProtocolFeesCryptoBaseUnit),
                from: sendAddress!,
                destinationAddress: receiveAddress!,
              })
              .catch(e => {
                console.error('Error getting ETH deposit request', e)
                return undefined
              })
          : undefined

      const networkFeeCryptoBaseUnit = await getNetworkFeeOrFallbackCryptoBaseUnit({
        maybeRequest,
        bridgeType,
        supportsEIP1559,
        adapter,
      })

      return { request: maybeRequest, networkFeeCryptoBaseUnit, allowanceContract: '0x0' }
    }
    case BRIDGE_TYPE.ETH_WITHDRAWAL: {
      const bridger = new EthBridger(l2Network)

      const maybeRequest =
        quoteOrRate === 'quote'
          ? await bridger
              .getWithdrawalRequest({
                amount: BigNumber.from(sellAmountIncludingProtocolFeesCryptoBaseUnit),
                from: sendAddress!,
                destinationAddress: receiveAddress!,
              })
              .catch(e => {
                console.error('Error getting ETH withdraw request', e)
                return undefined
              })
          : undefined

      const networkFeeCryptoBaseUnit = await getNetworkFeeOrFallbackCryptoBaseUnit({
        maybeRequest,
        bridgeType,
        supportsEIP1559,
        adapter,
      })

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
        quoteOrRate === 'quote'
          ? await bridger
              .getDepositRequest({
                amount: BigNumber.from(sellAmountIncludingProtocolFeesCryptoBaseUnit),
                parentProvider,
                childProvider,
                erc20ParentAddress,
                from: sendAddress!,
                destinationAddress: receiveAddress!,
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

      const networkFeeCryptoBaseUnit = await getNetworkFeeOrFallbackCryptoBaseUnit({
        maybeRequest,
        bridgeType,
        supportsEIP1559,
        adapter,
      })

      return { request: maybeRequest, networkFeeCryptoBaseUnit, allowanceContract }
    }
    case BRIDGE_TYPE.ERC20_WITHDRAWAL: {
      const bridger = new Erc20Bridger(l2Network)
      const erc20ParentAddress = fromAssetId(buyAsset.assetId).assetReference

      const maybeRequest =
        quoteOrRate === 'quote'
          ? await bridger
              .getWithdrawalRequest({
                amount: BigNumber.from(sellAmountIncludingProtocolFeesCryptoBaseUnit),
                erc20ParentAddress,
                from: sendAddress!,
                destinationAddress: receiveAddress!,
              })
              .catch(e => {
                console.error('Error getting ERC20 withdraw request', e)
                return undefined
              })
          : undefined

      const networkFeeCryptoBaseUnit = await getNetworkFeeOrFallbackCryptoBaseUnit({
        maybeRequest,
        bridgeType,
        supportsEIP1559,
        adapter,
      })

      return { request: maybeRequest, networkFeeCryptoBaseUnit, allowanceContract: '0x0' }
    }
    default:
      assertUnreachable(bridgeType)
  }
}

export const fetchArbitrumBridgePrice = (args: FetchArbitrumBridgePriceInput) =>
  fetchArbitrumBridgeSwap({ ...args, quoteOrRate: 'rate' })
export const fetchArbitrumBridgeQuote = (args: FetchArbitrumBridgeQuoteInput) =>
  fetchArbitrumBridgeSwap({ ...args, quoteOrRate: 'quote' })
