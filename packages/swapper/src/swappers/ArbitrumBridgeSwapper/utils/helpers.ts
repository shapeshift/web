import type {
  ChildToParentTransactionRequest,
  ParentToChildTransactionRequest,
} from '@arbitrum/sdk'
import { Erc20Bridger, getArbitrumNetwork } from '@arbitrum/sdk'
import { arbitrumAssetId, ethAssetId, ethChainId, fromAssetId } from '@shapeshiftoss/caip'
import type { EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import { evm } from '@shapeshiftoss/chain-adapters'
import { getEthersV5Provider } from '@shapeshiftoss/contracts'
import { type Asset, KnownChainIds } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads/build'
import { Err, Ok } from '@sniptt/monads/build'
import { getAddress, isAddressEqual } from 'viem'
import { arbitrum } from 'viem/chains'

import type { SwapErrorRight } from '../../../types'
import { TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import type { BRIDGE_TYPE } from '../types'
import { BRIDGE_TYPE_TO_FALLBACK_GAS_LIMIT } from './constants'
import type { ArbitrumBridgeSupportedChainId } from './types'
import { arbitrumBridgeSupportedChainIds } from './types'

export const assertValidTrade = async ({
  buyAsset,
  sellAsset,
}: {
  buyAsset: Asset
  sellAsset: Asset
}): Promise<Result<boolean, SwapErrorRight>> => {
  if (
    !arbitrumBridgeSupportedChainIds.includes(
      sellAsset.chainId as ArbitrumBridgeSupportedChainId,
    ) ||
    !arbitrumBridgeSupportedChainIds.includes(buyAsset.chainId as ArbitrumBridgeSupportedChainId)
  ) {
    return Err(
      makeSwapErrorRight({
        message: `[ArbitrumBridge: assertValidTrade] - unsupported chainId`,
        code: TradeQuoteError.UnsupportedChain,
        details: { buyAsset, sellAsset },
      }),
    )
  }

  if (buyAsset.chainId === sellAsset.chainId) {
    return Err(
      makeSwapErrorRight({
        message: `[ArbitrumBridge: assertValidTrade] - both assets must be on different chainIds`,
        code: TradeQuoteError.UnsupportedTradePair,
        details: { buyAsset, sellAsset },
      }),
    )
  }

  const isDeposit = sellAsset.chainId === ethChainId
  const isEthBridge = isDeposit
    ? sellAsset.assetId === ethAssetId
    : sellAsset.assetId === arbitrumAssetId
  const isTokenBridge = !isEthBridge

  if (isEthBridge) {
    const isInvalidPair = isDeposit
      ? buyAsset.assetId !== arbitrumAssetId
      : buyAsset.assetId !== ethAssetId

    if (isInvalidPair) {
      return Err(
        makeSwapErrorRight({
          message: `[ArbitrumBridge: tradeQuote] - Invalid ETH bridge pair`,
          code: TradeQuoteError.UnsupportedTradePair,
          details: { buyAsset, sellAsset },
        }),
      )
    }
  }
  if (isTokenBridge) {
    const childNetwork = await getArbitrumNetwork(arbitrum.id)
    const bridger = new Erc20Bridger(childNetwork)
    const erc20ParentAddress = fromAssetId(
      (isDeposit ? sellAsset : buyAsset).assetId,
    ).assetReference
    const erc20ChildAddress = fromAssetId((isDeposit ? buyAsset : sellAsset).assetId).assetReference
    const parentProvider = getEthersV5Provider(KnownChainIds.EthereumMainnet)
    const childProvider = getEthersV5Provider(KnownChainIds.ArbitrumMainnet)

    // Since our related assets list isn't exhaustive and won't cut it to determine the Parent <-> Child mapping, we double check that the bridge is valid
    // by checking against Arbitrum bridge's own mappings, which uses different sources (Coingecko, Gemini, Uni and its own lists at the time of writing)
    const arbitrumBridgeErc20ChildAddress = await bridger.getChildErc20Address(
      erc20ParentAddress,
      parentProvider,
    )
    const arbitrumBridgeErc20ParentAddress = await bridger.getParentErc20Address(
      erc20ChildAddress,
      childProvider,
    )

    if (
      !isAddressEqual(getAddress(arbitrumBridgeErc20ParentAddress), getAddress(erc20ParentAddress))
    ) {
      return Err(
        makeSwapErrorRight({
          message: `[ArbitrumBridge: tradeQuote] - Invalid Parent ERC20 address: ${erc20ParentAddress}`,
          code: TradeQuoteError.UnsupportedTradePair,
        }),
      )
    }
    if (
      !isAddressEqual(getAddress(arbitrumBridgeErc20ChildAddress), getAddress(erc20ChildAddress))
    ) {
      return Err(
        makeSwapErrorRight({
          message: `[ArbitrumBridge: tradeQuote] - Invalid Child ERC20 address: ${erc20ChildAddress}`,
          code: TradeQuoteError.UnsupportedTradePair,
        }),
      )
    }
  }

  return Ok(true)
}

export const getNetworkFeeOrFallbackCryptoBaseUnit = async ({
  maybeRequest,
  bridgeType,
  supportsEIP1559,
  adapter,
}: {
  maybeRequest: ParentToChildTransactionRequest | ChildToParentTransactionRequest | undefined
  bridgeType: BRIDGE_TYPE
  supportsEIP1559: boolean
  adapter: EvmChainAdapter
}) => {
  // Fallback fees
  if (!maybeRequest) {
    const { average } = await adapter.getGasFeeData()
    const { gasPrice, maxFeePerGas } = average

    const fallbackGasLimit = BRIDGE_TYPE_TO_FALLBACK_GAS_LIMIT[bridgeType]

    // eip1559 fees
    if (supportsEIP1559 && maxFeePerGas) {
      return fallbackGasLimit.times(maxFeePerGas).toFixed()
    }

    // legacy fees
    return fallbackGasLimit.times(gasPrice).toFixed()
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
}
