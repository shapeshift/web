import type { AssetId } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, fromAssetId, solAssetId } from '@shapeshiftoss/caip'
import type { GetFeeDataInput } from '@shapeshiftoss/chain-adapters'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { assertUnreachable } from '@shapeshiftoss/utils'
import { Err, Ok } from '@sniptt/monads'
import type { AxiosError } from 'axios'
import { v4 as uuid } from 'uuid'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type {
  CommonTradeQuoteInput,
  GetEvmTradeRateInput,
  GetTradeRateInput,
  GetUtxoTradeQuoteInput,
  ProtocolFee,
  SwapperDeps,
  SwapSource,
  TradeQuote,
  TradeQuoteResult,
} from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { getInputOutputRate, makeSwapErrorRight } from '../../../utils'
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
import { chainflipService } from './chainflipService'
import { getEvmTxFees } from './getEvmTxFees'
import { getUtxoTxFees } from './getUtxoTxFees'
import { getChainFlipIdFromAssetId, isSupportedAssetId, isSupportedChainId } from './helpers'

export const getRateOrQuote = async (
  input: GetTradeRateInput | CommonTradeQuoteInput,
  deps: SwapperDeps,
): Promise<TradeQuoteResult> => {
  const {
    accountNumber,
    receiveAddress,
    sellAsset,
    buyAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
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
      `&amount=${sellAmountIncludingProtocolFeesCryptoBaseUnit}` +
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

  const getFeeData = async () => {
    const { chainNamespace } = fromAssetId(sellAsset.assetId)

    switch (chainNamespace) {
      case CHAIN_NAMESPACE.Evm: {
        const sellAdapter = deps.assertGetEvmChainAdapter(sellAsset.chainId)
        const networkFeeCryptoBaseUnit = await getEvmTxFees({
          adapter: sellAdapter,
          supportsEIP1559: (input as GetEvmTradeRateInput).supportsEIP1559,
          sendAsset: sourceAsset,
        })
        return { networkFeeCryptoBaseUnit }
      }

      case CHAIN_NAMESPACE.Utxo: {
        const sellAdapter = deps.assertGetUtxoChainAdapter(sellAsset.chainId)
        const pubKey = (input as GetUtxoTradeQuoteInput).xpub
        return await getUtxoTxFees({
          sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
          sellAdapter,
          pubKey,
        })
      }

      case CHAIN_NAMESPACE.Solana: {
        if (!input.sendAddress) return { networkFeeCryptoBaseUnit: undefined }

        const sellAdapter = deps.assertGetSolanaChainAdapter(sellAsset.chainId)

        const getFeeDataInput: GetFeeDataInput<KnownChainIds.SolanaMainnet> = {
          // Simulates a self-send, since we don't know the 'to' just yet at this stage
          to: input.sendAddress,
          value: sellAmountIncludingProtocolFeesCryptoBaseUnit,
          chainSpecific: {
            from: input.sendAddress,
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

  const getChainflipQuoteRate = (
    sellAmountCryptoBaseUnit: string,
    buyAmountCryptoBaseUnit: string,
  ) => {
    return getInputOutputRate({
      sellAmountCryptoBaseUnit,
      buyAmountCryptoBaseUnit,
      sellAsset,
      buyAsset,
    })
  }

  const getSwapSource = (
    swapType: typeof CHAINFLIP_REGULAR_QUOTE | typeof CHAINFLIP_DCA_QUOTE,
    isBoosted: boolean,
  ): SwapSource => {
    if (swapType === CHAINFLIP_REGULAR_QUOTE) {
      return isBoosted ? CHAINFLIP_BOOST_SWAP_SOURCE : CHAINFLIP_SWAP_SOURCE
    }

    if (swapType === CHAINFLIP_DCA_QUOTE) {
      return isBoosted ? CHAINFLIP_DCA_BOOST_SWAP_SOURCE : CHAINFLIP_DCA_SWAP_SOURCE
    }

    return assertUnreachable(swapType)
  }

  const getMaxBoostFee = () => {
    const { chainNamespace } = fromAssetId(sellAsset.assetId)

    switch (chainNamespace) {
      case CHAIN_NAMESPACE.Evm:
        return 0

      case CHAIN_NAMESPACE.Utxo:
        return 10

      case CHAIN_NAMESPACE.Solana:
        return 0

      default:
        throw new Error('Unsupported chainNamespace')
    }
  }

  // A quote is a rate with guaranteed BIP44 params (account number/sender),
  // so we can return quotes which can be used as rates, but not the other way around
  // The 'input' determines if this is a rate or a quote based on the accountNumber and receiveAddress fields
  const ratesOrQuotes: TradeQuote[] = []

  for (const singleQuoteResponse of quoteResponse) {
    const isStreaming = singleQuoteResponse.type === CHAINFLIP_DCA_QUOTE

    if (isStreaming && !deps.config.REACT_APP_FEATURE_CHAINFLIP_SWAP_DCA) continue

    const feeData = await getFeeData()

    if (!singleQuoteResponse.type) throw new Error('Missing quote type')

    if (singleQuoteResponse.boostQuote) {
      const boostRate = getChainflipQuoteRate(
        singleQuoteResponse.boostQuote.ingressAmountNative!,
        singleQuoteResponse.boostQuote.egressAmountNative!,
      )

      const boostTradeRateOrQuote: TradeQuote = {
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
            chainflipSpecific: {
              chainflipNumberOfChunks: isStreaming
                ? singleQuoteResponse.boostQuote.numberOfChunks ?? undefined
                : undefined,
              chainflipChunkIntervalBlocks: isStreaming
                ? singleQuoteResponse.boostQuote.chunkIntervalBlocks ?? undefined
                : undefined,
              chainflipMaxBoostFee: getMaxBoostFee(),
            },
          },
        ],
      }

      ratesOrQuotes.push(boostTradeRateOrQuote)
    }

    const rate = getChainflipQuoteRate(
      singleQuoteResponse.ingressAmountNative!,
      singleQuoteResponse.egressAmountNative!,
    )

    const tradeRateOrQuote: TradeQuote = {
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
          chainflipSpecific: {
            chainflipNumberOfChunks: isStreaming
              ? singleQuoteResponse.numberOfChunks ?? undefined
              : undefined,
            chainflipChunkIntervalBlocks: isStreaming
              ? singleQuoteResponse.chunkIntervalBlocks ?? undefined
              : undefined,
            chainflipMaxBoostFee: 0,
          },
        },
      ],
    }

    ratesOrQuotes.push(tradeRateOrQuote)
  }

  return Ok(ratesOrQuotes)
}
