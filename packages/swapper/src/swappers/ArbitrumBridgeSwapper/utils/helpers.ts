import { Erc20Bridger, getL2Network } from '@arbitrum/sdk'
import { arbitrumAssetId, ethAssetId, ethChainId, fromAssetId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import { type Asset, KnownChainIds } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads/build'
import { Err, Ok } from '@sniptt/monads/build'
import type { ethers as ethersV5 } from 'ethers5'
import { getAddress, isAddressEqual } from 'viem'
import { arbitrum } from 'viem/chains'

import type { SwapErrorRight } from '../../../types'
import { TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import type { ArbitrumBridgeSupportedChainId } from './types'
import { arbitrumBridgeSupportedChainIds } from './types'

export const assertValidTrade = async ({
  buyAsset,
  sellAsset,
  getEthersV5Provider,
}: {
  buyAsset: Asset
  sellAsset: Asset
  getEthersV5Provider: (chainId: EvmChainId) => ethersV5.providers.JsonRpcProvider
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
    const l2Network = await getL2Network(arbitrum.id)
    const bridger = new Erc20Bridger(l2Network)
    const erc20L1Address = fromAssetId((isDeposit ? sellAsset : buyAsset).assetId).assetReference
    const erc20L2Address = fromAssetId((isDeposit ? buyAsset : sellAsset).assetId).assetReference
    const l1Provider = getEthersV5Provider(KnownChainIds.EthereumMainnet)
    const l2Provider = getEthersV5Provider(KnownChainIds.ArbitrumMainnet)

    // Since our related assets list isn't exhaustive and won't cut it to determine the L1 <-> L2 mapping, we double check that the bridge is valid
    // by checking against Arbitrum bridge's own mappings, which uses different sources (Coingecko, Gemini, Uni and its own lists at the time of writing)
    const arbitrumBridgeErc20L2Address = await bridger.getL2ERC20Address(erc20L1Address, l1Provider)
    const arbitrumBridgeErc20L1Address = await bridger.getL1ERC20Address(erc20L2Address, l2Provider)

    if (!isAddressEqual(getAddress(arbitrumBridgeErc20L1Address), getAddress(erc20L1Address))) {
      return Err(
        makeSwapErrorRight({
          message: `[ArbitrumBridge: tradeQuote] - Invalid L1 ERC20 address: ${erc20L1Address}`,
          code: TradeQuoteError.UnsupportedTradePair,
        }),
      )
    }
    if (!isAddressEqual(getAddress(arbitrumBridgeErc20L2Address), getAddress(erc20L2Address))) {
      return Err(
        makeSwapErrorRight({
          message: `[ArbitrumBridge: tradeQuote] - Invalid L2 ERC20 address: ${erc20L2Address}`,
          code: TradeQuoteError.UnsupportedTradePair,
        }),
      )
    }
  }

  return Ok(true)
}
