import { fromAssetId, fromChainId } from '@shapeshiftoss/caip'
import type { EvmBaseAdapter, EvmChainId } from '@shapeshiftoss/chain-adapters'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import type { GasFeeDataEstimate } from '@shapeshiftoss/chain-adapters/src/evm/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import type { GetEvmTradeQuoteInput, SwapErrorRight, TradeQuote } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapErrorType } from 'lib/swapper/api'
import { convertBasisPointsToPercentage } from 'state/zustand/swapperStore/utils'

import { isNativeEvmAsset } from '../../utils/helpers/helpers'
import { getApprovalAddress } from '../getApprovalAddress/getApprovalAddress'
import { getMinMax } from '../getMinMax/getMinMax'
import { APPROVAL_GAS_LIMIT, DEFAULT_SOURCE } from '../utils/constants'
import { getRate } from '../utils/helpers'
import { oneInchService } from '../utils/oneInchService'
import type { OneInchQuoteApiInput, OneInchQuoteResponse, OneInchSwapperDeps } from '../utils/types'

export async function getTradeQuote(
  deps: OneInchSwapperDeps,
  input: GetEvmTradeQuoteInput,
): Promise<Result<TradeQuote<EvmChainId>, SwapErrorRight>> {
  const {
    chainId,
    sellAsset,
    buyAsset,
    sellAmountBeforeFeesCryptoBaseUnit,
    accountNumber,
    affiliateBps,
  } = input

  if (sellAsset.chainId !== buyAsset.chainId) {
    return Err(
      makeSwapErrorRight({
        message: '[getTradeQuote] cross chain swaps not supported',
        code: SwapErrorType.UNSUPPORTED_PAIR,
      }),
    )
  }

  if (
    !isEvmChainId(chainId) ||
    !isEvmChainId(sellAsset.chainId) ||
    !isEvmChainId(buyAsset.chainId)
  ) {
    return Err(
      makeSwapErrorRight({
        message: '[getTradeQuote] invalid chainId',
        code: SwapErrorType.UNSUPPORTED_CHAIN,
      }),
    )
  }

  if (isNativeEvmAsset(sellAsset.assetId) || isNativeEvmAsset(buyAsset.assetId)) {
    return Err(
      makeSwapErrorRight({
        message: '[getTradeQuote] 1inch swapper only supports ERC20s',
        code: SwapErrorType.UNSUPPORTED_CHAIN,
      }),
    )
  }

  if (sellAmountBeforeFeesCryptoBaseUnit === '0') {
    return Err(
      makeSwapErrorRight({
        message: '[getTradeQuote] sellAmountBeforeFeesCryptoBaseUnit must be greater than 0',
        code: SwapErrorType.TRADE_BELOW_MINIMUM,
      }),
    )
  }

  const { assetReference: fromAssetAddress } = fromAssetId(sellAsset.assetId)
  const { assetReference: toAssetAddress } = fromAssetId(buyAsset.assetId)

  const buyTokenPercentageFee = convertBasisPointsToPercentage(affiliateBps).toNumber()

  const apiInput: OneInchQuoteApiInput = {
    fromTokenAddress: fromAssetAddress,
    toTokenAddress: toAssetAddress,
    amount: sellAmountBeforeFeesCryptoBaseUnit,
    fee: buyTokenPercentageFee,
  }

  const { chainReference } = fromChainId(chainId)
  const maybeQuoteResponse = await oneInchService.get<OneInchQuoteResponse>(
    `${deps.apiUrl}/${chainReference}/quote`,
    { params: apiInput },
  )

  if (maybeQuoteResponse.isErr()) return Err(maybeQuoteResponse.unwrapErr())
  const quoteResponse = maybeQuoteResponse.unwrap()

  const rate = getRate(quoteResponse.data).toString()

  const maybeAllowanceContract = await getApprovalAddress(deps, chainId)
  if (maybeAllowanceContract.isErr()) return Err(maybeAllowanceContract.unwrapErr())
  const allowanceContract = maybeAllowanceContract.unwrap()

  const maybeMinMax = await getMinMax(deps, sellAsset, buyAsset)

  const chainAdapterManager = getChainAdapterManager()
  // We guard against !isEvmChainId(chainId) above, so this cast is safe
  const adapter = chainAdapterManager.get(chainId) as unknown as EvmBaseAdapter<EvmChainId>
  if (adapter === undefined) {
    return Err(
      makeSwapErrorRight({
        message: '[getTradeQuote] - getChainAdapterManager returned undefined',
        code: SwapErrorType.UNSUPPORTED_NAMESPACE,
        details: { chainId: sellAsset.chainId },
      }),
    )
  }
  const gasFeeData: GasFeeDataEstimate = await adapter.getGasFeeData()

  const estimatedGas = bnOrZero(quoteResponse.data.estimatedGas).times(1.5) // added buffer
  const gasPriceCryptoBaseUnit = gasFeeData.fast.gasPrice
  const fee = estimatedGas.multipliedBy(gasPriceCryptoBaseUnit).toString()

  const approvalFeeCryptoBaseUnit = bn(APPROVAL_GAS_LIMIT)
    .multipliedBy(bnOrZero(gasPriceCryptoBaseUnit))
    .toFixed()

  return maybeMinMax.andThen(minMax =>
    Ok({
      rate,
      buyAsset,
      sellAsset,
      accountNumber,
      allowanceContract,
      buyAmountCryptoBaseUnit: quoteResponse.data.toTokenAmount,
      sellAmountBeforeFeesCryptoBaseUnit,
      maximumCryptoHuman: minMax.maximumAmountCryptoHuman,
      minimumCryptoHuman: minMax.minimumAmountCryptoHuman,
      feeData: {
        buyAssetTradeFeeUsd: '0',
        sellAssetTradeFeeUsd: '0',
        networkFeeCryptoBaseUnit: fee,
        chainSpecific: {
          estimatedGasCryptoBaseUnit: estimatedGas.toString(),
          gasPriceCryptoBaseUnit,
          approvalFeeCryptoBaseUnit,
        },
      },
      sources: DEFAULT_SOURCE,
    }),
  )
}
