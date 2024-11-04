import type { AssetId } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, fromAssetId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { AxiosError } from 'axios'
import { v4 as uuid } from 'uuid'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type {
  CommonTradeQuoteInput,
  GetTradeRateInput,
  GetUtxoTradeQuoteInput,
  SwapErrorRight,
  SwapperDeps,
  TradeQuote,
  TradeRate,
} from '../../../types'
import {
  type GetEvmTradeQuoteInput,
  type ProtocolFee,
  SwapperName,
  TradeQuoteError,
} from '../../../types'
import { getRate, makeSwapErrorRight } from '../../../utils'
import {
  CHAINFLIP_BAAS_COMMISSION,
  CHAINFLIP_BOOST_SWAP_SOURCE,
  CHAINFLIP_DCA_BOOST_SWAP_SOURCE,
  CHAINFLIP_DCA_QUOTE,
  CHAINFLIP_DCA_SWAP_SOURCE,
  CHAINFLIP_REGULAR_QUOTE,
  CHAINFLIP_SWAP_SOURCE,
  chainIdToChainflipNetwork,
  usdcAsset,
} from '../constants'
import type { ChainflipBaasQuoteQuote, ChainflipBaasQuoteQuoteFee } from '../models'
import { chainflipService } from '../utils/chainflipService'
import { getEvmTxFees } from '../utils/getEvmTxFees'
import { getUtxoTxFees } from '../utils/getUtxoTxFees'
import { isSupportedAssetId, isSupportedChainId } from '../utils/helpers'

const _getTradeQuote = async (
  input: CommonTradeQuoteInput,
  deps: SwapperDeps,
): Promise<Result<TradeQuote[], SwapErrorRight>> => {
  const {
    sellAsset,
    buyAsset,
    accountNumber,
    receiveAddress,
    sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmount,
    affiliateBps: commissionBps,
  } = input

  if (!isSupportedChainId(sellAsset.chainId)) {
    return Err(
      makeSwapErrorRight({
        message: `unsupported chainId`,
        code: TradeQuoteError.UnsupportedChain,
        details: { chainId: sellAsset.chainId },
      }),
    )
  }

  if (!isSupportedChainId(buyAsset.chainId)) {
    return Err(
      makeSwapErrorRight({
        message: `unsupported chainId`,
        code: TradeQuoteError.UnsupportedChain,
        details: { chainId: sellAsset.chainId },
      }),
    )
  }

  if (!isSupportedAssetId(sellAsset.chainId, sellAsset.assetId)) {
    return Err(
      makeSwapErrorRight({
        message: `asset '${sellAsset.name}' on chainId '${sellAsset.chainId}' not supported`,
        code: TradeQuoteError.UnsupportedTradePair,
        details: { chainId: sellAsset.chainId, assetId: sellAsset.assetId },
      }),
    )
  }

  if (!isSupportedAssetId(buyAsset.chainId, buyAsset.assetId)) {
    return Err(
      makeSwapErrorRight({
        message: `asset '${buyAsset.name}' on chainId '${buyAsset.chainId}' not supported`,
        code: TradeQuoteError.UnsupportedTradePair,
        details: { chainId: buyAsset.chainId, assetId: buyAsset.assetId },
      }),
    )
  }

  const sellChainflipChainKey = `${sellAsset.symbol.toLowerCase()}.${
    chainIdToChainflipNetwork[sellAsset.chainId]
  }`
  const buyChainflipChainKey = `${buyAsset.symbol.toLowerCase()}.${
    chainIdToChainflipNetwork[buyAsset.chainId]
  }`

  const brokerUrl = deps.config.REACT_APP_CHAINFLIP_API_URL
  const apiKey = deps.config.REACT_APP_CHAINFLIP_API_KEY

  // Subtract the BaaS fee to end up at the final displayed commissionBps
  let serviceCommission = parseInt(commissionBps) - CHAINFLIP_BAAS_COMMISSION
  if (serviceCommission < 0) serviceCommission = 0

  const maybeQuoteResponse = await chainflipService.get<ChainflipBaasQuoteQuote[]>(
    `${brokerUrl}/quotes-native` +
      `?apiKey=${apiKey}` +
      `&sourceAsset=${sellChainflipChainKey}` +
      `&destinationAsset=${buyChainflipChainKey}` +
      `&amount=${sellAmount}` +
      `&commissionBps=${serviceCommission}`,
  )

  if (maybeQuoteResponse.isErr()) {
    const error = maybeQuoteResponse.unwrapErr()
    const cause = error.cause as AxiosError<any, any>

    if (
      cause.message.includes('code 400') &&
      cause.response!.data.detail.includes('Amount outside asset bounds')
    ) {
      return Err(
        makeSwapErrorRight({
          message: cause.response!.data.detail,
          code: TradeQuoteError.SellAmountBelowMinimum,
        }),
      )
    }

    return Err(
      makeSwapErrorRight({
        message: 'Quote request failed',
        code: TradeQuoteError.NoRouteFound,
      }),
    )
  }

  const { data: quoteResponse } = maybeQuoteResponse.unwrap()

  const getNetworkFeeCryptoBaseUnit = async () => {
    const { chainNamespace } = fromAssetId(sellAsset.assetId)

    switch (chainNamespace) {
      case CHAIN_NAMESPACE.Evm: {
        const sellAdapter = deps.assertGetEvmChainAdapter(sellAsset.chainId)
        // TODO(gomes): double check dis correct
        return await getEvmTxFees({
          adapter: sellAdapter,
          supportsEIP1559: (input as GetEvmTradeQuoteInput).supportsEIP1559,
          sendAsset: sellChainflipChainKey,
        })
      }

      case CHAIN_NAMESPACE.Utxo: {
        const sellAdapter = deps.assertGetUtxoChainAdapter(sellAsset.chainId)
        const publicKey = (input as GetUtxoTradeQuoteInput).xpub!
        // TODO(gomes): double check dis correct
        return await getUtxoTxFees({
          sellAmountCryptoBaseUnit: sellAmount,
          sellAdapter,
          publicKey,
        })
      }

      // TODO(gomes): Cosmos SDK too
      case CHAIN_NAMESPACE.CosmosSdk:
      case CHAIN_NAMESPACE.Solana:
      default: {
        // TODO: Solana gas calc
        return undefined
      }
    }
  }

  const getFeeAsset = (fee: ChainflipBaasQuoteQuoteFee) => {
    if (fee.type === 'ingress' || fee.type === 'boost') return sellAsset

    if (fee.type === 'egress') return buyAsset

    if (fee.type === 'liquidity' && fee.asset === sellChainflipChainKey) return sellAsset

    if (fee.type === 'liquidity' && fee.asset === buyChainflipChainKey) return buyAsset

    if (fee.type === 'liquidity' && fee.asset === 'usdc.eth') return usdcAsset

    if (fee.type === 'network') return usdcAsset
  }

  const getProtocolFees = (singleQuoteResponse: ChainflipBaasQuoteQuote) => {
    const protocolFees: Record<AssetId, ProtocolFee> = {}

    for (const fee of singleQuoteResponse.includedFees!) {
      if (fee.type === 'broker') continue

      const asset = getFeeAsset(fee)!
      if (!(asset.assetId in protocolFees)) {
        protocolFees[asset.assetId] = {
          amountCryptoBaseUnit: '0',
          requiresBalance: false,
          asset,
        }
      }

      protocolFees[asset.assetId].amountCryptoBaseUnit = (
        BigInt(protocolFees[asset.assetId].amountCryptoBaseUnit) + BigInt(fee.amountNative!)
      ).toString()
    }

    return protocolFees
  }

  const getQuoteRate = (sellAmountCryptoBaseUnit: string, buyAmountCryptoBaseUnit: string) => {
    return getRate({
      sellAmountCryptoBaseUnit,
      buyAmountCryptoBaseUnit,
      sellAsset,
      buyAsset,
    })
  }

  const getSwapSource = (swapType: string | undefined, isBoosted: boolean) => {
    return swapType === CHAINFLIP_REGULAR_QUOTE
      ? isBoosted
        ? CHAINFLIP_BOOST_SWAP_SOURCE
        : CHAINFLIP_SWAP_SOURCE
      : isBoosted
      ? CHAINFLIP_DCA_BOOST_SWAP_SOURCE
      : CHAINFLIP_DCA_SWAP_SOURCE
  }

  const quotes: TradeQuote[] = []

  for (const singleQuoteResponse of quoteResponse) {
    const isStreaming = singleQuoteResponse.type === CHAINFLIP_DCA_QUOTE

    if (isStreaming && !deps.config.REACT_APP_FEATURE_CHAINFLIP_DCA) {
      // DCA currently disabled - Streaming swap logic is very much tied to THOR currently and will deserve its own PR to generalize
      // Even if we manage to get DCA swaps to execute, we wouldn't manage to properly poll with current web THOR-centric arch
      continue
    }

    if (singleQuoteResponse.boostQuote) {
      const boostRate = getQuoteRate(
        singleQuoteResponse.boostQuote.ingressAmountNative!,
        singleQuoteResponse.boostQuote.egressAmountNative!,
      )

      const boostTradeQuote: TradeQuote = {
        id: uuid(),
        rate: boostRate,
        receiveAddress,
        potentialAffiliateBps: commissionBps,
        affiliateBps: commissionBps,
        isStreaming,
        slippageTolerancePercentageDecimal: getDefaultSlippageDecimalPercentageForSwapper(
          SwapperName.Chainflip,
        ),
        steps: [
          {
            buyAmountBeforeFeesCryptoBaseUnit: singleQuoteResponse.boostQuote.egressAmountNative!,
            buyAmountAfterFeesCryptoBaseUnit: singleQuoteResponse.boostQuote.egressAmountNative!,
            sellAmountIncludingProtocolFeesCryptoBaseUnit:
              singleQuoteResponse.boostQuote.ingressAmountNative!,
            feeData: {
              networkFeeCryptoBaseUnit: await getNetworkFeeCryptoBaseUnit(),
              protocolFees: getProtocolFees(singleQuoteResponse.boostQuote),
            },
            rate: boostRate,
            source: getSwapSource(singleQuoteResponse.type, true),
            buyAsset,
            sellAsset,
            accountNumber,
            allowanceContract: '0x0', // Chainflip does not use contracts
            estimatedExecutionTimeMs:
              singleQuoteResponse.boostQuote.estimatedDurationSeconds! * 1000,
          },
        ],
      }

      quotes.push(boostTradeQuote)
    }

    const rate = getQuoteRate(
      singleQuoteResponse.ingressAmountNative!,
      singleQuoteResponse.egressAmountNative!,
    )

    const tradeQuote: TradeQuote = {
      id: uuid(),
      rate,
      receiveAddress,
      potentialAffiliateBps: commissionBps,
      affiliateBps: commissionBps,
      isStreaming,
      slippageTolerancePercentageDecimal: getDefaultSlippageDecimalPercentageForSwapper(
        SwapperName.Chainflip,
      ),
      steps: [
        {
          buyAmountBeforeFeesCryptoBaseUnit: singleQuoteResponse.egressAmountNative!,
          buyAmountAfterFeesCryptoBaseUnit: singleQuoteResponse.egressAmountNative!,
          sellAmountIncludingProtocolFeesCryptoBaseUnit: singleQuoteResponse.ingressAmountNative!,
          feeData: {
            networkFeeCryptoBaseUnit: await getNetworkFeeCryptoBaseUnit(),
            protocolFees: getProtocolFees(singleQuoteResponse),
          },
          rate,
          source: getSwapSource(singleQuoteResponse.type, false),
          buyAsset,
          sellAsset,
          accountNumber,
          allowanceContract: '0x0', // Chainflip does not use contracts - all Txs are sends
          estimatedExecutionTimeMs: singleQuoteResponse.estimatedDurationSeconds! * 1000,
        },
      ],
    }

    quotes.push(tradeQuote)
  }

  return Ok(quotes)
}

// This isn't a mistake. A trade rate *is* a trade quote. Chainflip doesn't really have a notion of a trade quote,
// they do have a notion of a "swap" (which we effectively only use to get the deposit address), which is irrelevant to the notion of quote vs. rate
export const getTradeRate = async (
  input: GetTradeRateInput,
  deps: SwapperDeps,
): Promise<Result<TradeRate[], SwapErrorRight>> => {
  const rates = await _getTradeQuote(input as unknown as CommonTradeQuoteInput, deps)
  return rates as Result<TradeRate[], SwapErrorRight>
}

export const getTradeQuote = async (
  input: CommonTradeQuoteInput,
  deps: SwapperDeps,
): Promise<Result<TradeQuote[], SwapErrorRight>> => {
  const { accountNumber } = input

  if (accountNumber === undefined) {
    return Err(
      makeSwapErrorRight({
        message: `accountNumber is required`,
        code: TradeQuoteError.UnknownError,
      }),
    )
  }

  const quotes = await _getTradeQuote(input, deps)
  return quotes
}
