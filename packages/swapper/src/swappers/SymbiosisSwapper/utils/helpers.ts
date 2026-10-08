import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { ASSET_NAMESPACE, fromAssetId, toAssetId, tronChainId } from '@shapeshiftoss/caip'
import { tron } from '@shapeshiftoss/chain-adapters'
import type { Asset } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { bn, bnOrZero, chainIdToFeeAssetId, isToken } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { getAddress, keccak256, toHex } from 'viem'

import type { QuoteFeeData, SwapErrorRight, TradeStatus } from '../../../types'
import { TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import {
  chainIdToSymbiosisChainId,
  DEFAULT_SYMBIOSIS_EVM_USER_ADDRESS,
  DEFAULT_SYMBIOSIS_TRON_USER_ADDRESS,
  SYMBIOSIS_CROSSCHAIN_SWAP_KIND,
  SYMBIOSIS_MAX_SLIPPAGE_BPS,
  SYMBIOSIS_MIN_SLIPPAGE_BPS,
  SYMBIOSIS_PARTNER_ADDRESS,
  SYMBIOSIS_PARTNER_FEE_BPS,
  SYMBIOSIS_PARTNER_SWAP_LABEL,
  SYMBIOSIS_SEMI_CENTRALIZED_LABEL,
  SYMBIOSIS_SRC_CHAIN_SWAP_LABEL,
  SYMBIOSIS_TRON_BRIDGE_ENERGY,
  SYMBIOSIS_TRON_SOURCE_SWAP_ENERGY,
  symbiosisChainIdToChainId,
} from './constants'
import type {
  SymbiosisFee,
  SymbiosisQuoteResponse,
  SymbiosisToken,
  SymbiosisTxResponse,
} from './types'
import { SymbiosisStatusCode } from './types'

export const assertValidTrade = ({
  sellAsset,
  buyAsset,
}: {
  sellAsset: Asset
  buyAsset: Asset
}): Result<{ sellSymbiosisChainId: number; buySymbiosisChainId: number }, SwapErrorRight> => {
  const sellSymbiosisChainId = chainIdToSymbiosisChainId[sellAsset.chainId]
  const buySymbiosisChainId = chainIdToSymbiosisChainId[buyAsset.chainId]

  if (sellSymbiosisChainId === undefined) {
    return Err(
      makeSwapErrorRight({
        message: `Sell asset chain '${sellAsset.chainId}' not supported by Symbiosis`,
        code: TradeQuoteError.UnsupportedChain,
      }),
    )
  }

  if (buySymbiosisChainId === undefined) {
    return Err(
      makeSwapErrorRight({
        message: `Buy asset chain '${buyAsset.chainId}' not supported by Symbiosis`,
        code: TradeQuoteError.UnsupportedChain,
      }),
    )
  }

  if (sellAsset.chainId === buyAsset.chainId) {
    return Err(
      makeSwapErrorRight({
        message: 'Symbiosis same-chain swaps are not supported',
        code: TradeQuoteError.UnsupportedTradePair,
      }),
    )
  }

  return Ok({ sellSymbiosisChainId, buySymbiosisChainId })
}

export const getSymbiosisTokenAddress = (asset: Asset): string => {
  if (!isToken(asset.assetId)) return ''

  const { assetReference } = fromAssetId(asset.assetId)
  if (asset.chainId === tronChainId) return tron.toTronHex(assetReference)

  return getAddress(assetReference)
}

export const getSymbiosisSlippageBps = (slippageTolerancePercentageDecimal: string): number => {
  const bps = Math.round(bnOrZero(slippageTolerancePercentageDecimal).times(10000).toNumber())

  return Math.min(Math.max(bps, SYMBIOSIS_MIN_SLIPPAGE_BPS), SYMBIOSIS_MAX_SLIPPAGE_BPS)
}

export const getDefaultUserAddress = (chainId: ChainId): string =>
  chainId === tronChainId ? DEFAULT_SYMBIOSIS_TRON_USER_ADDRESS : DEFAULT_SYMBIOSIS_EVM_USER_ADDRESS

// Symbiosis fixes the partner rate on its side, so only a fee-free swap or the registered rate can be honored
export const getSymbiosisPartnerAddress = (
  affiliateBps: string,
): Result<string | undefined, SwapErrorRight> => {
  const requestedBps = bnOrZero(affiliateBps)

  if (requestedBps.isZero()) return Ok(undefined)
  if (requestedBps.eq(SYMBIOSIS_PARTNER_FEE_BPS)) return Ok(SYMBIOSIS_PARTNER_ADDRESS)

  return Err(
    makeSwapErrorRight({
      message: `Symbiosis only supports a ${SYMBIOSIS_PARTNER_FEE_BPS} bps affiliate fee, got ${affiliateBps}`,
      code: TradeQuoteError.UnsupportedTradePair,
    }),
  )
}

// Symbiosis returns the function signature and its encoded parameters separately
export const buildSymbiosisTronCallData = ({
  functionSelector,
  data,
}: {
  functionSelector: string
  data: string
}): string => {
  const selector = keccak256(toHex(functionSelector)).slice(0, 10)
  const parameters = data.startsWith('0x') ? data.slice(2) : data

  return `${selector}${parameters}`
}

export const getSymbiosisTronFallbackEnergy = (labels: string[]): string =>
  labels.includes(SYMBIOSIS_SRC_CHAIN_SWAP_LABEL)
    ? SYMBIOSIS_TRON_SOURCE_SWAP_ENERGY
    : SYMBIOSIS_TRON_BRIDGE_ENERGY

export const isSymbiosisRouteSupported = ({
  quote,
  sellAsset,
}: {
  quote: SymbiosisQuoteResponse
  sellAsset: Asset
}): boolean => {
  if (quote.kind !== SYMBIOSIS_CROSSCHAIN_SWAP_KIND) return false
  if (quote.labels.includes(SYMBIOSIS_PARTNER_SWAP_LABEL)) return false
  if (quote.labels.includes(SYMBIOSIS_SEMI_CENTRALIZED_LABEL)) return false

  const expectedType = sellAsset.chainId === tronChainId ? 'tron' : 'evm'

  return quote.type === expectedType
}

export const getSymbiosisFeeAssetId = ({
  chainId: symbiosisChainId,
  address,
}: Pick<SymbiosisToken, 'chainId' | 'address'>): AssetId | undefined => {
  const chainId = symbiosisChainIdToChainId[symbiosisChainId]
  if (!chainId) return

  if (!address) return chainIdToFeeAssetId(chainId)

  if (chainId === tronChainId) {
    return toAssetId({
      chainId,
      assetNamespace: ASSET_NAMESPACE.trc20,
      assetReference: tron.toTronBase58(address),
    })
  }

  return toAssetId({
    chainId,
    assetNamespace: ASSET_NAMESPACE.erc20,
    assetReference: address.toLowerCase(),
  })
}

// Fees on the Symbiosis host chain are charged in sTokens we have no asset for - they are already net of the buy amount
export const getSymbiosisProtocolFees = (
  fees: SymbiosisFee[],
): NonNullable<QuoteFeeData['protocolFees']> =>
  fees.reduce<NonNullable<QuoteFeeData['protocolFees']>>((acc, { value }) => {
    const assetId = getSymbiosisFeeAssetId(value)
    const chainId = symbiosisChainIdToChainId[value.chainId]
    if (!assetId || !chainId) return acc

    acc[assetId] = {
      amountCryptoBaseUnit: bnOrZero(acc[assetId]?.amountCryptoBaseUnit)
        .plus(value.amount)
        .toFixed(0),
      asset: { symbol: value.symbol, chainId, precision: value.decimals },
      requiresBalance: false,
    }

    return acc
  }, {})

export const symbiosisErrorToTradeQuoteError = (message: string | undefined): TradeQuoteError => {
  if (message?.startsWith('Amount is too low')) return TradeQuoteError.SellAmountBelowTradeFee
  if (message === 'This swap is not available') return TradeQuoteError.NoRouteFound

  return TradeQuoteError.QueryFailed
}

// A mined Tron call that did not succeed (REVERT, OUT_OF_ENERGY, ...) never reaches Symbiosis, which answers not found for it
export const isTronSourceTxFailed = (tx: { ret?: { contractRet?: string }[] }): boolean => {
  const contractRet = tx.ret?.[0]?.contractRet

  return contractRet !== undefined && contractRet !== 'SUCCESS'
}

export const getSymbiosisTradeStatus = ({
  response,
  buySymbiosisChainId,
}: {
  response: SymbiosisTxResponse
  buySymbiosisChainId: number | undefined
}): Pick<TradeStatus, 'status' | 'buyTxHash' | 'message'> => {
  const { status, tx, transitTokenSent } = response

  switch (status.code) {
    case SymbiosisStatusCode.Success: {
      // Until the operation is indexed, Symbiosis answers Success for the plain source transaction
      if (tx?.chainId !== buySymbiosisChainId) {
        return { status: TxStatus.Pending, buyTxHash: undefined, message: undefined }
      }

      const message = transitTokenSent
        ? `Received ${bn(transitTokenSent.amount)
            .shiftedBy(-transitTokenSent.decimals)
            .toFixed()} ${transitTokenSent.symbol} instead of the buy asset`
        : undefined

      return { status: TxStatus.Confirmed, buyTxHash: tx?.hash, message }
    }
    case SymbiosisStatusCode.Pending:
      return { status: TxStatus.Pending, buyTxHash: undefined, message: undefined }
    case SymbiosisStatusCode.Stuck:
      return {
        status: TxStatus.Pending,
        buyTxHash: undefined,
        message: 'Swap is stuck and is being reverted by Symbiosis',
      }
    case SymbiosisStatusCode.Reverted:
      return {
        status: TxStatus.Failed,
        buyTxHash: undefined,
        message: 'Swap was reverted by Symbiosis',
      }
    default:
      return { status: TxStatus.Unknown, buyTxHash: undefined, message: undefined }
  }
}
