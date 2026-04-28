import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { evm } from '@shapeshiftoss/chain-adapters'
import { viemClientByChainId } from '@shapeshiftoss/contracts'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import BigNumber from 'bignumber.js'
import type { Address, Hex } from 'viem'
import { pad } from 'viem'

import type {
  SwapErrorRight,
  SwapperDeps,
  TradeQuote,
  TradeQuoteStep,
  TradeRate,
  TradeRateStep,
} from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { getInputOutputRate, makeSwapErrorRight } from '../../../utils'
import { isNativeEvmAsset } from '../../utils/helpers/helpers'
import {
  chainIdToStargateEndpointId,
  DEFAULT_STARGATE_USER_ADDRESS,
  STARGATE_NATIVE_ASSET_ADDRESS,
  STARGATE_SUPPORTED_CHAIN_IDS,
  stargateContractsByChainAndAsset,
} from '../constant'
import type { StargateMessagingFee, StargateSendParam, StargateTransactionMetadata } from '../types'
import {
  decodeQuoteOFTResult,
  decodeQuoteSendResult,
  encodeQuoteOFT,
  encodeQuoteSend,
  encodeSend,
} from './helpers'

type StargateTradeInput<T extends 'quote' | 'rate'> = {
  sellAsset: {
    assetId: AssetId
    chainId: ChainId
    precision: number
    symbol: string
  } & Record<string, unknown>
  buyAsset: {
    assetId: AssetId
    chainId: ChainId
    precision: number
    symbol: string
  } & Record<string, unknown>
  sellAmountIncludingProtocolFeesCryptoBaseUnit: string
  sendAddress: T extends 'quote' ? string : string | undefined
  receiveAddress: T extends 'quote' ? string : string | undefined
  accountNumber: T extends 'quote' ? number : undefined
  affiliateBps: string
  slippageTolerancePercentageDecimal?: string
  quoteOrRate: T
}

const getStargateAssetAddress = (assetId: AssetId): string => {
  if (isNativeEvmAsset(assetId)) return STARGATE_NATIVE_ASSET_ADDRESS
  const { assetReference } = fromAssetId(assetId)
  return assetReference.toLowerCase()
}

export async function fetchStargateTrade(args: {
  input: StargateTradeInput<'quote'>
  deps: SwapperDeps
}): Promise<Result<TradeQuote[], SwapErrorRight>>

export async function fetchStargateTrade(args: {
  input: StargateTradeInput<'rate'>
  deps: SwapperDeps
}): Promise<Result<TradeRate[], SwapErrorRight>>

export async function fetchStargateTrade<T extends 'quote' | 'rate'>({
  input,
  deps,
}: {
  input: StargateTradeInput<T>
  deps: SwapperDeps
}): Promise<Result<TradeQuote[] | TradeRate[], SwapErrorRight>> {
  const {
    sellAsset,
    buyAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    accountNumber,
    affiliateBps,
  } = input

  if (sellAsset.chainId === buyAsset.chainId) {
    return Err(
      makeSwapErrorRight({
        message: 'Stargate does not support same-chain swaps',
        code: TradeQuoteError.UnsupportedTradePair,
      }),
    )
  }

  if (!STARGATE_SUPPORTED_CHAIN_IDS.includes(sellAsset.chainId)) {
    return Err(
      makeSwapErrorRight({
        message: `Sell asset chain '${sellAsset.chainId}' not supported by Stargate`,
        code: TradeQuoteError.UnsupportedChain,
      }),
    )
  }

  if (!STARGATE_SUPPORTED_CHAIN_IDS.includes(buyAsset.chainId)) {
    return Err(
      makeSwapErrorRight({
        message: `Buy asset chain '${buyAsset.chainId}' not supported by Stargate`,
        code: TradeQuoteError.UnsupportedChain,
      }),
    )
  }

  const sellAssetAddress = getStargateAssetAddress(sellAsset.assetId)
  const chainContracts = stargateContractsByChainAndAsset[sellAsset.chainId]
  const contractAddress = chainContracts?.[sellAssetAddress] as Address | undefined

  if (!contractAddress) {
    return Err(
      makeSwapErrorRight({
        message: `No Stargate contract found for asset ${sellAsset.assetId} on chain ${sellAsset.chainId}`,
        code: TradeQuoteError.UnsupportedTradePair,
      }),
    )
  }

  const dstEid =
    chainIdToStargateEndpointId[buyAsset.chainId as keyof typeof chainIdToStargateEndpointId]

  if (dstEid === undefined) {
    return Err(
      makeSwapErrorRight({
        message: `No LayerZero endpoint ID found for chain ${buyAsset.chainId}`,
        code: TradeQuoteError.UnsupportedChain,
      }),
    )
  }

  const receiveAddress =
    input.quoteOrRate === 'rate'
      ? input.receiveAddress ?? DEFAULT_STARGATE_USER_ADDRESS
      : input.receiveAddress

  const sendAddress =
    input.quoteOrRate === 'rate'
      ? input.sendAddress ?? DEFAULT_STARGATE_USER_ADDRESS
      : input.sendAddress

  if (!receiveAddress) {
    return Err(
      makeSwapErrorRight({
        message: 'Receive address is required',
        code: TradeQuoteError.InternalError,
      }),
    )
  }

  if (!sendAddress) {
    return Err(
      makeSwapErrorRight({
        message: 'Send address is required',
        code: TradeQuoteError.InternalError,
      }),
    )
  }

  const paddedReceiveAddress = pad(receiveAddress as Hex, { size: 32 })
  const amountLD = BigInt(sellAmountIncludingProtocolFeesCryptoBaseUnit)

  const sendParam: StargateSendParam = {
    dstEid,
    to: paddedReceiveAddress,
    amountLD,
    minAmountLD: 0n,
    extraOptions: '0x' as Hex,
    composeMsg: '0x' as Hex,
    oftCmd: '0x' as Hex,
  }

  const publicClient = viemClientByChainId[sellAsset.chainId]

  if (!publicClient) {
    return Err(
      makeSwapErrorRight({
        message: `No public client found for chain ${sellAsset.chainId}`,
        code: TradeQuoteError.InternalError,
      }),
    )
  }

  try {
    const quoteOFTCalldata = encodeQuoteOFT(sendParam)

    const quoteOFTResult = await publicClient.call({
      to: contractAddress,
      data: quoteOFTCalldata,
    })

    if (!quoteOFTResult.data) {
      return Err(
        makeSwapErrorRight({
          message: 'quoteOFT returned no data',
          code: TradeQuoteError.NoRouteFound,
        }),
      )
    }

    const [_limit, _oftFeeDetails, receipt] = decodeQuoteOFTResult(quoteOFTResult.data as Hex)

    const detailDstAmountLD = receipt.amountReceivedLD
    const detailFeeAmountLD = receipt.amountSentLD - receipt.amountReceivedLD

    // Apply slippage to minAmountLD so the on-chain send() will revert if the
    // fill is worse than the quoted amount minus user-selected (or default) slippage.
    const DEFAULT_SLIPPAGE_BPS = 50n // 0.5%
    const slippageBps = input.slippageTolerancePercentageDecimal
      ? BigInt(Math.round(parseFloat(input.slippageTolerancePercentageDecimal) * 10000))
      : DEFAULT_SLIPPAGE_BPS
    sendParam.minAmountLD = (detailDstAmountLD * (10000n - slippageBps)) / 10000n

    const quoteSendCalldata = encodeQuoteSend(sendParam, false)

    const quoteSendResult = await publicClient.call({
      to: contractAddress,
      data: quoteSendCalldata,
    })

    if (!quoteSendResult.data) {
      return Err(
        makeSwapErrorRight({
          message: 'quoteSend returned no data',
          code: TradeQuoteError.NoRouteFound,
        }),
      )
    }

    const { nativeFee, lzTokenFee } = decodeQuoteSendResult(
      quoteSendResult.data as Hex,
    ) as { nativeFee: bigint; lzTokenFee: bigint }
    const messagingFee: StargateMessagingFee = { nativeFee, lzTokenFee }

    const buyAmountAfterFeesCryptoBaseUnit = detailDstAmountLD.toString()
    const buyAmountBeforeFeesCryptoBaseUnit = (detailDstAmountLD + detailFeeAmountLD).toString()
    const protocolFeeAmountCryptoBaseUnit = detailFeeAmountLD.toString()
    const nativeFeeCryptoBaseUnit = messagingFee.nativeFee.toString()

    const rate = getInputOutputRate({
      sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      buyAmountCryptoBaseUnit: buyAmountAfterFeesCryptoBaseUnit,
      sellAsset: sellAsset as Parameters<typeof getInputOutputRate>[0]['sellAsset'],
      buyAsset: buyAsset as Parameters<typeof getInputOutputRate>[0]['buyAsset'],
    })

    const sendCalldata = encodeSend(
      sendParam,
      { nativeFee: messagingFee.nativeFee, lzTokenFee: messagingFee.lzTokenFee },
      sendAddress as Hex,
    )

    const isNative = isNativeEvmAsset(sellAsset.assetId)
    const txValue = isNative
      ? new BigNumber(nativeFeeCryptoBaseUnit)
          .plus(sellAmountIncludingProtocolFeesCryptoBaseUnit)
          .toFixed(0)
      : nativeFeeCryptoBaseUnit

    const adapter = deps.assertGetEvmChainAdapter(sellAsset.chainId)
    const { average } = await adapter.getGasFeeData()
    const supportsEIP1559 = 'maxFeePerGas' in average

    let gasLimit = '500000'
    const networkFeeCryptoBaseUnit = await (async () => {
      try {
        const feeData = await evm.getFees({
          adapter,
          data: sendCalldata,
          to: contractAddress,
          value: txValue,
          from: sendAddress,
          supportsEIP1559,
        })
        gasLimit = feeData.gasLimit ?? gasLimit
        return feeData.networkFeeCryptoBaseUnit
      } catch (e) {
        console.warn('[Stargate] Fee estimation failed, using fallback gas limit', {
          error: e instanceof Error ? e.message : String(e),
          sellAsset: sellAsset.assetId,
        })
        return evm.calcNetworkFeeCryptoBaseUnit({
          ...average,
          supportsEIP1559,
          gasLimit,
        })
      }
    })()

    const stargateTransactionMetadata: StargateTransactionMetadata = {
      to: contractAddress,
      data: sendCalldata,
      value: txValue,
      gasLimit,
    }

    const protocolFees: Record<
      AssetId,
      {
        amountCryptoBaseUnit: string
        asset: { symbol: string; chainId: ChainId; precision: number }
        requiresBalance: boolean
      }
    > = {
      [sellAsset.assetId]: {
        amountCryptoBaseUnit: protocolFeeAmountCryptoBaseUnit,
        asset: {
          symbol: sellAsset.symbol,
          chainId: sellAsset.chainId,
          precision: sellAsset.precision,
        },
        requiresBalance: false,
      },
    }

    const step: TradeQuoteStep | TradeRateStep = {
      allowanceContract: contractAddress,
      rate,
      buyAmountBeforeFeesCryptoBaseUnit,
      buyAmountAfterFeesCryptoBaseUnit,
      sellAmountIncludingProtocolFeesCryptoBaseUnit,
      buyAsset: buyAsset as TradeQuoteStep['buyAsset'],
      sellAsset: sellAsset as TradeQuoteStep['sellAsset'],
      accountNumber: accountNumber as number | undefined,
      feeData: {
        networkFeeCryptoBaseUnit,
        protocolFees,
      },
      source: SwapperName.Stargate,
      estimatedExecutionTimeMs: 60_000,
      stargateTransactionMetadata,
    }

    const baseQuoteOrRate = {
      id: `stargate-${sellAsset.chainId}-${buyAsset.chainId}-${Date.now()}`,
      rate,
      swapperName: SwapperName.Stargate,
      affiliateBps,
      slippageTolerancePercentageDecimal: input.slippageTolerancePercentageDecimal,
    }

    if (input.quoteOrRate === 'quote') {
      const tradeQuote: TradeQuote = {
        ...baseQuoteOrRate,
        steps: [step as TradeQuoteStep],
        receiveAddress,
        quoteOrRate: 'quote' as const,
      }
      return Ok([tradeQuote])
    }

    const tradeRate: TradeRate = {
      ...baseQuoteOrRate,
      steps: [step as TradeRateStep],
      receiveAddress,
      quoteOrRate: 'rate' as const,
    }
    return Ok([tradeRate])
  } catch (e) {
    return Err(
      makeSwapErrorRight({
        message: `Stargate quote failed: ${e instanceof Error ? e.message : String(e)}`,
        code: TradeQuoteError.NoRouteFound,
      }),
    )
  }
}
