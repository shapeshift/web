import { fromAssetId, fromChainId } from '@shapeshiftoss/caip'
import type { EvmBaseAdapter, EvmChainId } from '@shapeshiftoss/chain-adapters'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import type { GasFeeDataEstimate } from '@shapeshiftoss/chain-adapters/src/evm/types'
import type { Result } from '@sniptt/monads/build'
import { Ok } from '@sniptt/monads/build'
import type { AxiosResponse } from 'axios'
import axios from 'axios'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import type { GetEvmTradeQuoteInput, SwapErrorRight, TradeQuote } from 'lib/swapper/api'
import { SwapError, SwapErrorType } from 'lib/swapper/api'

import { getApprovalAddress } from '../getApprovalAddress/getApprovalAddress'
import { getMinMax } from '../getMinMax/getMinMax'
import { APPROVAL_GAS_LIMIT, DEFAULT_SOURCE } from '../utils/constants'
import { getRate } from '../utils/helpers'
import type { OneInchQuoteApiInput, OneInchQuoteResponse, OneInchSwapperDeps } from '../utils/types'

export async function getTradeQuote(
  deps: OneInchSwapperDeps,
  input: GetEvmTradeQuoteInput,
): Promise<Result<TradeQuote<EvmChainId>, SwapErrorRight>> {
  const { chainId, sellAsset, buyAsset, sellAmountBeforeFeesCryptoBaseUnit, accountNumber } = input

  if (sellAsset.chainId !== buyAsset.chainId) {
    throw new SwapError('[getTradeQuote] cross chain swaps not supported', {
      code: SwapErrorType.UNSUPPORTED_PAIR,
    })
  }

  if (
    !isEvmChainId(chainId) ||
    !isEvmChainId(sellAsset.chainId) ||
    !isEvmChainId(buyAsset.chainId)
  ) {
    throw new SwapError('[getTradeQuote] invalid chainId', {
      code: SwapErrorType.UNSUPPORTED_CHAIN,
    })
  }

  const { assetReference: fromAssetAddress } = fromAssetId(sellAsset.assetId)
  const { assetReference: toAssetAddress } = fromAssetId(buyAsset.assetId)

  const apiInput: OneInchQuoteApiInput = {
    fromTokenAddress: fromAssetAddress,
    toTokenAddress: toAssetAddress,
    amount: sellAmountBeforeFeesCryptoBaseUnit,
  }
  const { chainReference } = fromChainId(chainId)
  const quoteResponse: AxiosResponse<OneInchQuoteResponse> = await axios.get(
    `${deps.apiUrl}/${chainReference}/quote`,
    { params: apiInput },
  )

  const rate = getRate(quoteResponse.data).toString()
  const allowanceContract = await getApprovalAddress(deps, chainId)
  const minMax = await getMinMax(deps, sellAsset, buyAsset)

  const chainAdapterManager = getChainAdapterManager()
  // We guard against !isEvmChainId(chainId) above, so this cast is safe
  const adapter = chainAdapterManager.get(chainId) as unknown as EvmBaseAdapter<EvmChainId>
  if (adapter === undefined) {
    throw new SwapError('[getTradeQuote] - getChainAdapterManager returned undefined', {
      code: SwapErrorType.UNSUPPORTED_NAMESPACE,
      details: { chainId: sellAsset.chainId },
    })
  }
  const gasFeeData: GasFeeDataEstimate = await adapter.getGasFeeData()

  const estimatedGas = bnOrZero(quoteResponse.data.estimatedGas).times(1.5) // added buffer
  const gasPriceCryptoBaseUnit = gasFeeData.fast.gasPrice
  const fee = estimatedGas.multipliedBy(gasPriceCryptoBaseUnit).toString()

  const approvalFeeCryptoBaseUnit = bn(APPROVAL_GAS_LIMIT)
    .multipliedBy(bnOrZero(gasPriceCryptoBaseUnit))
    .toFixed()

  return Ok({
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
  })
}
