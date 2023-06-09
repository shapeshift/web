import { fromAssetId, fromChainId } from '@shapeshiftoss/caip'
import type { EvmBaseAdapter, EvmChainId } from '@shapeshiftoss/chain-adapters'
import type { GasFeeDataEstimate } from '@shapeshiftoss/chain-adapters/src/evm/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { bnOrZero } from 'lib/bignumber/bignumber'
import type { GetEvmTradeQuoteInput, SwapErrorRight, TradeQuote } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapErrorType } from 'lib/swapper/api'
import { convertBasisPointsToPercentage } from 'state/zustand/swapperStore/utils'

import { getApprovalAddress } from '../getApprovalAddress/getApprovalAddress'
import { getMinimumAmountCryptoHuman } from '../getMinimumAmountCryptoHuman/getMinimumAmountCryptoHuman'
import { DEFAULT_SOURCE } from '../utils/constants'
import { getRate } from '../utils/helpers'
import { oneInchService } from '../utils/oneInchService'
import type { OneInchQuoteApiInput, OneInchQuoteResponse, OneInchSwapperDeps } from '../utils/types'

export async function getTradeQuote(
  { apiUrl }: OneInchSwapperDeps,
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
    `${apiUrl}/${chainReference}/quote`,
    { params: apiInput },
  )

  if (maybeQuoteResponse.isErr()) return Err(maybeQuoteResponse.unwrapErr())
  const quoteResponse = maybeQuoteResponse.unwrap()

  const rate = getRate(quoteResponse.data).toString()

  const maybeAllowanceContract = await getApprovalAddress(apiUrl, chainId)
  if (maybeAllowanceContract.isErr()) return Err(maybeAllowanceContract.unwrapErr())
  const allowanceContract = maybeAllowanceContract.unwrap()

  const maybeMinimumAmountCryptoHuman = getMinimumAmountCryptoHuman(sellAsset, buyAsset)

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

  // TODO(woodenfurniture): l1 fees for optimism and eip-1551 gas estimation
  const fee = bnOrZero(quoteResponse.data.estimatedGas)
    .multipliedBy(gasFeeData.average.gasPrice)
    .toString()

  return maybeMinimumAmountCryptoHuman.andThen(minimumAmountCryptoHuman =>
    Ok({
      minimumCryptoHuman: minimumAmountCryptoHuman,
      steps: [
        {
          allowanceContract,
          rate,
          buyAsset,
          sellAsset,
          accountNumber,
          buyAmountBeforeFeesCryptoBaseUnit: quoteResponse.data.toTokenAmount,
          sellAmountBeforeFeesCryptoBaseUnit,
          feeData: {
            protocolFees: {},
            networkFeeCryptoBaseUnit: fee,
          },
          sources: DEFAULT_SOURCE,
        },
      ],
    }),
  )
}
