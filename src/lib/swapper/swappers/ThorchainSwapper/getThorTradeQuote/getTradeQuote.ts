import type { AssetId } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, fromAssetId } from '@shapeshiftoss/caip'
import type {
  CosmosSdkBaseAdapter,
  EvmBaseAdapter,
  UtxoBaseAdapter,
} from '@shapeshiftoss/chain-adapters'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { BigNumber } from 'lib/bignumber/bignumber'
import { baseUnitToPrecision, bn, bnOrZero, convertPrecision } from 'lib/bignumber/bignumber'
import { fromBaseUnit, toBaseUnit } from 'lib/math'
import type {
  GetTradeQuoteInput,
  GetUtxoTradeQuoteInput,
  ProtocolFee,
  SwapErrorRight,
  TradeQuote,
} from 'lib/swapper/api'
import { makeSwapErrorRight, SwapErrorType, SwapperName } from 'lib/swapper/api'
import type {
  ThorChainId,
  ThorCosmosSdkSupportedChainId,
  ThorEvmSupportedChainId,
  ThorUtxoSupportedChainId,
} from 'lib/swapper/swappers/ThorchainSwapper/ThorchainSwapper'
import type { ThorchainSwapperDeps } from 'lib/swapper/swappers/ThorchainSwapper/types'
import {
  THOR_MINIMUM_PADDING,
  THORCHAIN_FIXED_PRECISION,
} from 'lib/swapper/swappers/ThorchainSwapper/utils/constants'
import { getInboundAddressDataForChain } from 'lib/swapper/swappers/ThorchainSwapper/utils/getInboundAddressDataForChain'
import { getQuote } from 'lib/swapper/swappers/ThorchainSwapper/utils/getQuote/getQuote'
import { getTradeRateBelowMinimum } from 'lib/swapper/swappers/ThorchainSwapper/utils/getTradeRate/getTradeRate'
import { getEvmTxFees } from 'lib/swapper/swappers/ThorchainSwapper/utils/txFeeHelpers/evmTxFees/getEvmTxFees'
import { getUtxoTxFees } from 'lib/swapper/swappers/ThorchainSwapper/utils/txFeeHelpers/utxoTxFees/getUtxoTxFees'
import { getThorTxInfo } from 'lib/swapper/swappers/ThorchainSwapper/utxo/utils/getThorTxData'
import { DEFAULT_SLIPPAGE } from 'lib/swapper/swappers/utils/constants'
import {
  selectBuyAssetUsdRate,
  selectSellAssetUsdRate,
} from 'state/zustand/swapperStore/amountSelectors'
import { swapperStore } from 'state/zustand/swapperStore/useSwapperStore'

type GetThorTradeQuoteInput = {
  deps: ThorchainSwapperDeps
  input: GetTradeQuoteInput
}

type GetThorTradeQuoteReturn = Promise<Result<TradeQuote<ThorChainId>, SwapErrorRight>>

type GetThorTradeQuote = (args: GetThorTradeQuoteInput) => GetThorTradeQuoteReturn

export const getThorTradeQuote: GetThorTradeQuote = async ({ deps, input }) => {
  const {
    sellAsset,
    buyAsset,
    sellAmountBeforeFeesCryptoBaseUnit: sellAmountCryptoBaseUnit,
    accountNumber,
    chainId,
    receiveAddress,
    affiliateBps,
  } = input

  const { chainId: buyAssetChainId } = fromAssetId(buyAsset.assetId)

  const sellAdapter = deps.adapterManager.get(chainId)
  const buyAdapter = deps.adapterManager.get(buyAssetChainId)
  if (!sellAdapter || !buyAdapter)
    return Err(
      makeSwapErrorRight({
        message: `[getThorTradeQuote] - No chain adapter found for ${chainId} or ${buyAssetChainId}.`,
        code: SwapErrorType.UNSUPPORTED_CHAIN,
        details: { sellAssetChainId: chainId, buyAssetChainId },
      }),
    )

  const quote = await getQuote({
    sellAsset,
    buyAssetId: buyAsset.assetId,
    sellAmountCryptoBaseUnit,
    receiveAddress,
    affiliateBps,
    deps,
  })

  const slippagePercentage = quote.isOk()
    ? bn(quote.unwrap().slippage_bps).div(1000)
    : bn(DEFAULT_SLIPPAGE).times(100)

  const rate = (
    await quote.match({
      ok: quote => {
        const THOR_PRECISION = 8
        const expectedAmountOutThorBaseUnit = quote.expected_amount_out
        const sellAmountCryptoPrecision = baseUnitToPrecision({
          value: sellAmountCryptoBaseUnit,
          inputExponent: sellAsset.precision,
        })
        // All thorchain pool amounts are base 8 regardless of token precision
        const sellAmountCryptoThorBaseUnit = bn(
          toBaseUnit(sellAmountCryptoPrecision, THOR_PRECISION),
        )

        return Promise.resolve(
          Ok(bnOrZero(expectedAmountOutThorBaseUnit).div(sellAmountCryptoThorBaseUnit).toFixed()),
        )
      },
      // TODO: Handle TRADE_BELOW_MINIMUM specifically and return a result here as well
      // Though realistically, TRADE_BELOW_MINIMUM is the only one we should really be seeing here,
      // safety never hurts
      err: _err =>
        getTradeRateBelowMinimum({
          sellAssetId: sellAsset.assetId,
          buyAssetId: buyAsset.assetId,
          deps,
        }),
    })
  ).unwrap()

  const fees = quote.isOk() ? quote.unwrap().fees : undefined

  const sellAssetUsdRate = selectSellAssetUsdRate(swapperStore.getState())
  const buyAssetUsdRate = selectBuyAssetUsdRate(swapperStore.getState())
  const buySellAssetRate = bn(buyAssetUsdRate).div(sellAssetUsdRate)

  const maybeBuyAssetTradeFeeBuyAssetCryptoThorPrecision = fees
    ? Ok(bnOrZero(fees.outbound))
    : (await getInboundAddressDataForChain(deps.daemonUrl, buyAsset.assetId)).andThen<BigNumber>(
        data => Ok(bnOrZero(data?.outbound_fee)),
      )

  const buyAssetTradeFeeBuyAssetCryptoThorPrecision =
    maybeBuyAssetTradeFeeBuyAssetCryptoThorPrecision.isErr()
      ? bn(0)
      : maybeBuyAssetTradeFeeBuyAssetCryptoThorPrecision.unwrap()

  const buyAssetTradeFeeBuyAssetCryptoHuman = fromBaseUnit(
    buyAssetTradeFeeBuyAssetCryptoThorPrecision,
    THORCHAIN_FIXED_PRECISION,
  )

  const buyAssetTradeFeeBuyAssetCryptoBaseUnit = convertPrecision({
    value: buyAssetTradeFeeBuyAssetCryptoThorPrecision,
    inputExponent: THORCHAIN_FIXED_PRECISION,
    outputExponent: buyAsset.precision,
  })

  // donation is denominated in the buy asset from thor but we display it in sell asset for ux reasons
  const sellAssetTradeFeeCryptoBaseUnit = convertPrecision({
    value: fees ? fees.affiliate : '0',
    inputExponent: THORCHAIN_FIXED_PRECISION,
    outputExponent: sellAsset.precision,
  }).times(buySellAssetRate)

  // If we have a quote, we can use the quote's expected amount out. If not it's either a 0-value trade or an error, so use '0'.
  // Because the expected_amount_out is the amount after fees, we need to add them back on to get the "before fees" amount
  const buyAmountCryptoBaseUnit = (() => {
    if (quote.isOk()) {
      const unwrappedQuote = quote.unwrap()
      const expectedAmountOutThorBaseUnit = unwrappedQuote.expected_amount_out
      // Add back the outbound fees
      const expectedAmountPlusFeesCryptoThorBaseUnit = bn(expectedAmountOutThorBaseUnit)
        .plus(unwrappedQuote.fees.outbound)
        .plus(unwrappedQuote.fees.affiliate)

      return toBaseUnit(
        fromBaseUnit(expectedAmountPlusFeesCryptoThorBaseUnit, THORCHAIN_FIXED_PRECISION),
        buyAsset.precision,
      )
    } else {
      return '0'
    }
  })()

  const buyAssetTradeFeeUsd = bn(buyAssetUsdRate)
    .times(buyAssetTradeFeeBuyAssetCryptoHuman)
    .toString()

  const minimumSellAssetAmountCryptoHuman = bn(sellAssetUsdRate).isGreaterThan(0)
    ? bnOrZero(buyAssetTradeFeeUsd).div(sellAssetUsdRate)
    : bn(0) // We don't have a valid rate for the sell asset, there is no sane minimum

  // minimum is tradeFee padded by an amount to be sure they get something back
  // usually it will be slightly more than the amount because sellAssetTradeFee is already a high estimate
  const minimumSellAssetAmountPaddedCryptoHuman = minimumSellAssetAmountCryptoHuman
    .times(THOR_MINIMUM_PADDING)
    .toString()

  const commonQuoteFields = {
    minimumCryptoHuman: minimumSellAssetAmountPaddedCryptoHuman,
    recommendedSlippage: slippagePercentage.div(100).toString(),
  }

  const commonStepFields = {
    rate,
    sellAmountBeforeFeesCryptoBaseUnit: sellAmountCryptoBaseUnit,
    buyAmountBeforeFeesCryptoBaseUnit: buyAmountCryptoBaseUnit,
    sources: [{ name: SwapperName.Thorchain, proportion: '1' }],
    buyAsset,
    sellAsset,
    accountNumber,
  }

  const protocolFees: Record<AssetId, ProtocolFee> = {}

  if (!buyAssetTradeFeeBuyAssetCryptoBaseUnit.isZero()) {
    protocolFees[buyAsset.assetId] = {
      amountCryptoBaseUnit: buyAssetTradeFeeBuyAssetCryptoBaseUnit.toString(),
      requiresBalance: false,
      asset: buyAsset,
    }
  }

  if (!sellAssetTradeFeeCryptoBaseUnit.isZero()) {
    protocolFees[sellAsset.assetId] = {
      amountCryptoBaseUnit: sellAssetTradeFeeCryptoBaseUnit.toString(),
      requiresBalance: false,
      asset: sellAsset,
    }
  }

  const { chainNamespace } = fromAssetId(sellAsset.assetId)
  switch (chainNamespace) {
    case CHAIN_NAMESPACE.Evm:
      return (async (): Promise<
        Promise<Result<TradeQuote<ThorEvmSupportedChainId>, SwapErrorRight>>
      > => {
        const sellChainFeeAssetId = sellAdapter.getFeeAssetId()
        const maybeEvmAddressData = await getInboundAddressDataForChain(
          deps.daemonUrl,
          sellChainFeeAssetId,
          false,
        )
        if (maybeEvmAddressData.isErr()) return Err(maybeEvmAddressData.unwrapErr())
        const evmAddressData = maybeEvmAddressData.unwrap()

        const router = evmAddressData?.router
        if (!router)
          return Err(
            makeSwapErrorRight({
              message: `[getThorTradeQuote] No router address found for ${sellChainFeeAssetId}`,
            }),
          )

        const feeData = await getEvmTxFees({
          adapter: sellAdapter as unknown as EvmBaseAdapter<ThorEvmSupportedChainId>,
          protocolFees,
        })

        return Ok({
          ...commonQuoteFields,
          steps: [
            {
              ...commonStepFields,
              allowanceContract: router,
              feeData,
            },
          ],
        })
      })()

    case CHAIN_NAMESPACE.Utxo:
      return (async (): Promise<Result<TradeQuote<ThorUtxoSupportedChainId>, SwapErrorRight>> => {
        const maybeThorTxInfo = await getThorTxInfo({
          deps,
          sellAsset,
          buyAsset,
          sellAmountCryptoBaseUnit,
          slippageTolerance: DEFAULT_SLIPPAGE,
          destinationAddress: receiveAddress,
          xpub: (input as GetUtxoTradeQuoteInput).xpub,
          protocolFees,
          affiliateBps,
        })

        if (maybeThorTxInfo.isErr()) return Err(maybeThorTxInfo.unwrapErr())
        const thorTxInfo = maybeThorTxInfo.unwrap()
        const { vault, opReturnData, pubkey } = thorTxInfo

        const feeData = await getUtxoTxFees({
          sellAmountCryptoBaseUnit,
          vault,
          opReturnData,
          pubkey,
          sellAdapter: sellAdapter as unknown as UtxoBaseAdapter<ThorUtxoSupportedChainId>,
          protocolFees,
        })

        return Ok({
          ...commonQuoteFields,
          steps: [
            {
              ...commonStepFields,
              allowanceContract: '0x0', // not applicable to bitcoin
              feeData,
            },
          ],
        })
      })()
    case CHAIN_NAMESPACE.CosmosSdk:
      return (async (): Promise<
        Result<TradeQuote<ThorCosmosSdkSupportedChainId>, SwapErrorRight>
      > => {
        const feeData = await (
          sellAdapter as unknown as CosmosSdkBaseAdapter<ThorCosmosSdkSupportedChainId>
        ).getFeeData({})

        return Ok({
          ...commonQuoteFields,
          steps: [
            {
              ...commonStepFields,
              allowanceContract: '0x0', // not applicable to cosmos
              feeData: {
                networkFeeCryptoBaseUnit: feeData.fast.txFee,
                protocolFees,
                chainSpecific: { estimatedGasCryptoBaseUnit: feeData.fast.chainSpecific.gasLimit },
              },
            },
          ],
        })
      })()
    default:
      return Err(
        makeSwapErrorRight({
          message: '[getThorTradeQuote] - Asset chainId is not supported.',
          code: SwapErrorType.UNSUPPORTED_CHAIN,
          details: { chainId },
        }),
      )
  }
}
