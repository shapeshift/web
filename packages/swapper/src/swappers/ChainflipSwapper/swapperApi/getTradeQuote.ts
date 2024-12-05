import type { AssetId } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, fromAssetId, solAssetId } from '@shapeshiftoss/caip'
import type { GetFeeDataInput } from '@shapeshiftoss/chain-adapters'
import type { KnownChainIds } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { AxiosError } from 'axios'
import { v4 as uuid } from 'uuid'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type {
  CommonTradeQuoteInput,
  GetEvmTradeQuoteInput,
  GetUtxoTradeQuoteInput,
  ProtocolFee,
  SwapErrorRight,
  SwapperDeps,
  TradeQuote,
} from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import {
  createTradeAmountTooSmallErr,
  getInputOutputRate,
  makeSwapErrorRight,
} from '../../../utils'
import {
  CHAINFLIP_BAAS_COMMISSION,
  CHAINFLIP_BOOST_SWAP_SOURCE,
  CHAINFLIP_DCA_BOOST_SWAP_SOURCE,
  CHAINFLIP_DCA_QUOTE,
  CHAINFLIP_DCA_SWAP_SOURCE,
  CHAINFLIP_REGULAR_QUOTE,
  CHAINFLIP_SWAP_SOURCE,
  usdcAsset,
} from '../constants'
import type { ChainflipBaasQuoteQuote, ChainflipBaasQuoteQuoteFee } from '../models'
import { chainflipService } from '../utils/chainflipService'
import { getEvmTxFees } from '../utils/getEvmTxFees'
import { getUtxoTxFees } from '../utils/getUtxoTxFees'
import { getChainFlipIdFromAssetId, isSupportedAssetId, isSupportedChainId } from '../utils/helpers'

export const _getTradeQuote = async (
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

  const brokerUrl = deps.config.REACT_APP_CHAINFLIP_API_URL
  const apiKey = deps.config.REACT_APP_CHAINFLIP_API_KEY

  const sourceAsset = await getChainFlipIdFromAssetId({
    assetId: sellAsset.assetId,
    brokerUrl,
  })
  const destinationAsset = await getChainFlipIdFromAssetId({
    assetId: buyAsset.assetId,
    brokerUrl,
  })

  // Subtract the BaaS fee to end up at the final displayed commissionBps
  let serviceCommission = parseInt(commissionBps) - CHAINFLIP_BAAS_COMMISSION
  if (serviceCommission < 0) serviceCommission = 0

  const maybeQuoteResponse = await chainflipService.get<ChainflipBaasQuoteQuote[]>(
    `${brokerUrl}/quotes-native` +
      `?apiKey=${apiKey}` +
      `&sourceAsset=${sourceAsset}` +
      `&destinationAsset=${destinationAsset}` +
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
        createTradeAmountTooSmallErr({
          assetId: sellAsset.assetId,
          minAmountCryptoBaseUnit: cause.response!.data.errors.minimalAmountNative[0],
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

  const getFeeData = async () => {
    const { chainNamespace } = fromAssetId(sellAsset.assetId)

    switch (chainNamespace) {
      case CHAIN_NAMESPACE.Evm: {
        const sellAdapter = deps.assertGetEvmChainAdapter(sellAsset.chainId)
        const networkFeeCryptoBaseUnit = await getEvmTxFees({
          adapter: sellAdapter,
          supportsEIP1559: (input as GetEvmTradeQuoteInput).supportsEIP1559,
          sendAsset: sourceAsset,
        })
        return { networkFeeCryptoBaseUnit }
      }

      case CHAIN_NAMESPACE.Utxo: {
        const sellAdapter = deps.assertGetUtxoChainAdapter(sellAsset.chainId)
        const publicKey = (input as GetUtxoTradeQuoteInput).xpub!
        const feeData = await getUtxoTxFees({
          sellAmountCryptoBaseUnit: sellAmount,
          sellAdapter,
          publicKey,
        })

        return feeData
      }

      case CHAIN_NAMESPACE.Solana: {
        const sellAdapter = deps.assertGetSolanaChainAdapter(sellAsset.chainId)
        const getFeeDataInput: GetFeeDataInput<KnownChainIds.SolanaMainnet> = {
          // Simulates a self-send, since we don't know the to just yet at this stage
          to: input.sendAddress!,
          value: sellAmount,
          chainSpecific: {
            from: input.sendAddress!,
            tokenId:
              sellAsset.assetId === solAssetId
                ? undefined
                : fromAssetId(sellAsset.assetId).assetReference,
          },
        }
        const { fast } = await sellAdapter.getFeeData(getFeeDataInput)
        return { networkFeeCryptoBaseUnit: fast.txFee }
      }

      default:
        throw new Error('Unsupported chainNamespace')
    }
  }

  const getFeeAsset = (fee: ChainflipBaasQuoteQuoteFee) => {
    if (fee.type === 'ingress' || fee.type === 'boost') return sellAsset

    if (fee.type === 'egress') return buyAsset

    if (fee.type === 'liquidity' && fee.asset === sourceAsset) return sellAsset

    if (fee.type === 'liquidity' && fee.asset === destinationAsset) return buyAsset

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
    return getInputOutputRate({
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
    const feeData = await getFeeData()

    if (isStreaming && !deps.config.REACT_APP_FEATURE_CHAINFLIP_SWAP_DCA) {
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
        slippageTolerancePercentageDecimal:
          input.slippageTolerancePercentageDecimal ??
          getDefaultSlippageDecimalPercentageForSwapper(SwapperName.Chainflip),
        steps: [
          {
            buyAmountBeforeFeesCryptoBaseUnit: singleQuoteResponse.boostQuote.egressAmountNative!,
            buyAmountAfterFeesCryptoBaseUnit: singleQuoteResponse.boostQuote.egressAmountNative!,
            sellAmountIncludingProtocolFeesCryptoBaseUnit:
              singleQuoteResponse.boostQuote.ingressAmountNative!,
            feeData: {
              protocolFees: getProtocolFees(singleQuoteResponse.boostQuote),
              ...feeData,
            },
            rate: boostRate,
            source: getSwapSource(singleQuoteResponse.type, true),
            buyAsset,
            sellAsset,
            accountNumber,
            allowanceContract: '0x0', // Chainflip does not use contracts
            estimatedExecutionTimeMs:
              (singleQuoteResponse.boostQuote.estimatedDurationsSeconds!.deposit! +
                singleQuoteResponse.boostQuote.estimatedDurationsSeconds!.swap!) *
              1000,
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
      slippageTolerancePercentageDecimal:
        input.slippageTolerancePercentageDecimal ??
        getDefaultSlippageDecimalPercentageForSwapper(SwapperName.Chainflip),
      steps: [
        {
          buyAmountBeforeFeesCryptoBaseUnit: singleQuoteResponse.egressAmountNative!,
          buyAmountAfterFeesCryptoBaseUnit: singleQuoteResponse.egressAmountNative!,
          sellAmountIncludingProtocolFeesCryptoBaseUnit: singleQuoteResponse.ingressAmountNative!,
          feeData: {
            protocolFees: getProtocolFees(singleQuoteResponse),
            ...feeData,
          },
          rate,
          source: getSwapSource(singleQuoteResponse.type, false),
          buyAsset,
          sellAsset,
          accountNumber,
          allowanceContract: '0x0', // Chainflip does not use contracts - all Txs are sends
          estimatedExecutionTimeMs:
            (singleQuoteResponse.estimatedDurationsSeconds!.deposit! +
              singleQuoteResponse.estimatedDurationsSeconds!.swap!) *
            1000,
        },
      ],
    }

    quotes.push(tradeQuote)
  }

  return Ok(quotes)
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
