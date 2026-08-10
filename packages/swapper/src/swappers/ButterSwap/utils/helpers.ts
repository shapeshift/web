import type { ChainId } from '@shapeshiftoss/caip'
import { btcChainId, solanaChainId, tronChainId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import type { Asset } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import { BigAmount, bnOrZero } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import {
  arbitrum,
  avalanche,
  base,
  bsc,
  mainnet as ethereum,
  optimism,
  polygon,
  robinhood,
  tron,
} from 'viem/chains'

import type { SwapErrorRight } from '../../../types'
import { TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import type { RouteSuccessItem } from '../types'

// https://docs.butternetwork.io/butter-swap-integration/butter-api-for-routing/get-supportedchainlist#butter-chain-id-explanation
const BUTTERSWAP_CHAIN_ID_TO_CHAIN_ID: Record<number, KnownChainIds> = {
  [ethereum.id]: KnownChainIds.EthereumMainnet,
  [polygon.id]: KnownChainIds.PolygonMainnet,
  [bsc.id]: KnownChainIds.BnbSmartChainMainnet,
  [arbitrum.id]: KnownChainIds.ArbitrumMainnet,
  [optimism.id]: KnownChainIds.OptimismMainnet,
  [base.id]: KnownChainIds.BaseMainnet,
  [avalanche.id]: KnownChainIds.AvalancheMainnet,
  [robinhood.id]: KnownChainIds.RobinhoodMainnet,
  1360108768460801: KnownChainIds.SolanaMainnet,
  1360095883558913: KnownChainIds.BitcoinMainnet,
  [tron.id]: KnownChainIds.TronMainnet,
}

const CHAIN_ID_TO_BUTTERSWAP_CHAIN_ID: Record<KnownChainIds, number> = Object.entries(
  BUTTERSWAP_CHAIN_ID_TO_CHAIN_ID,
).reduce(
  (acc, [butterSwapChainId, chainId]) => {
    acc[chainId] = Number(butterSwapChainId)
    return acc
  },
  {} as Record<KnownChainIds, number>,
)

export const butterSwapChainIdToChainId = (butterSwapChainId: number): ChainId | undefined => {
  return BUTTERSWAP_CHAIN_ID_TO_CHAIN_ID[butterSwapChainId]
}

export const chainIdToButterSwapChainId = (chainId: ChainId): number | undefined => {
  return CHAIN_ID_TO_BUTTERSWAP_CHAIN_ID[chainId as KnownChainIds]
}

export const assertValidTrade = ({
  sellAsset,
}: {
  sellAsset: Asset
}): Result<void, SwapErrorRight> => {
  if (
    !isEvmChainId(sellAsset.chainId) &&
    sellAsset.chainId !== btcChainId &&
    sellAsset.chainId !== solanaChainId &&
    sellAsset.chainId !== tronChainId
  ) {
    return Err(
      makeSwapErrorRight({
        message: `Unsupported chain`,
        code: TradeQuoteError.UnsupportedChain,
      }),
    )
  }

  return Ok(undefined)
}

// Provider reported network fee - the rate fallback when estimation fails, and the fee for the
// un-migrated tron quote path (exec computes the real fee at execution)
export const getProviderNetworkFeeCryptoBaseUnit = ({
  route,
  feeAsset,
}: {
  route: RouteSuccessItem
  feeAsset: Asset
}): string => {
  if (bnOrZero(route.gasFee?.amount).lte(0)) return '0'

  return BigAmount.fromPrecision({
    value: route.gasFee.amount,
    precision: feeAsset.precision,
  }).toBaseUnit()
}
