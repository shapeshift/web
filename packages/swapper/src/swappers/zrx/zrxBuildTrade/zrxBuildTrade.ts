import { fromAssetId } from '@shapeshiftoss/caip'
import { AxiosResponse } from 'axios'
import * as rax from 'retry-axios'

import { BuildTradeInput, EvmSupportedChainIds, SwapError, SwapErrorTypes } from '../../../api'
import { erc20AllowanceAbi } from '../../utils/abi/erc20Allowance-abi'
import { bnOrZero } from '../../utils/bignumber'
import { APPROVAL_GAS_LIMIT, DEFAULT_SLIPPAGE } from '../../utils/constants'
import { isApprovalRequired, normalizeAmount } from '../../utils/helpers/helpers'
import { ZrxQuoteResponse, ZrxSwapperDeps, ZrxTrade } from '../types'
import { applyAxiosRetry } from '../utils/applyAxiosRetry'
import { AFFILIATE_ADDRESS, DEFAULT_SOURCE } from '../utils/constants'
import { baseUrlFromChainId } from '../utils/helpers/helpers'
import { zrxServiceFactory } from '../utils/zrxService'

export async function zrxBuildTrade<T extends EvmSupportedChainIds>(
  { adapter, web3 }: ZrxSwapperDeps,
  input: BuildTradeInput,
): Promise<ZrxTrade<T>> {
  const { sellAsset, buyAsset, sellAmountCryptoPrecision, slippage, bip44Params, receiveAddress } =
    input
  try {
    const { assetReference: buyAssetErc20Address, assetNamespace: buyAssetNamespace } = fromAssetId(
      buyAsset.assetId,
    )
    const { assetReference: sellAssetErc20Address, assetNamespace: sellAssetNamespace } =
      fromAssetId(sellAsset.assetId)
    const buyToken = buyAssetNamespace === 'erc20' ? buyAssetErc20Address : buyAsset.symbol
    const sellToken = sellAssetNamespace === 'erc20' ? sellAssetErc20Address : sellAsset.symbol

    const adapterChainId = adapter.getChainId()

    if (buyAsset.chainId !== adapterChainId) {
      throw new SwapError(`[zrxBuildTrade] - buyAsset must be on chainId ${adapterChainId}`, {
        code: SwapErrorTypes.VALIDATION_FAILED,
        details: { chainId: sellAsset.chainId },
      })
    }

    const slippagePercentage = slippage ? bnOrZero(slippage).div(100).toString() : DEFAULT_SLIPPAGE

    const baseUrl = baseUrlFromChainId(buyAsset.chainId)
    const zrxService = zrxServiceFactory(baseUrl)

    /**
     * /swap/v1/quote
     * params: {
     *   sellToken: contract address (or symbol) of token to sell
     *   buyToken: contractAddress (or symbol) of token to buy
     *   sellAmount?: integer string value of the smallest increment of the sell token
     * }
     */

    const zrxRetry = applyAxiosRetry(zrxService, {
      statusCodesToRetry: [[400, 400]],
      shouldRetry: (err) => {
        const cfg = rax.getConfig(err)
        const retryAttempt = cfg?.currentRetryAttempt ?? 0
        const retry = cfg?.retry ?? 3
        // ensure max retries is always respected
        if (retryAttempt >= retry) return false
        // retry if 0x returns error code 111 Gas estimation failed
        if (err?.response?.data?.code === 111) return true

        // Handle the request based on your other config options, e.g. `statusCodesToRetry`
        return rax.shouldRetryRequest(err)
      },
    })
    const quoteResponse: AxiosResponse<ZrxQuoteResponse> = await zrxRetry.get<ZrxQuoteResponse>(
      '/swap/v1/quote',
      {
        params: {
          buyToken,
          sellToken,
          sellAmount: normalizeAmount(sellAmountCryptoPrecision),
          takerAddress: receiveAddress,
          slippagePercentage,
          skipValidation: false,
          affiliateAddress: AFFILIATE_ADDRESS,
        },
      },
    )

    const { data } = quoteResponse

    const estimatedGas = bnOrZero(data.gas || 0)
    const networkFee = bnOrZero(estimatedGas).multipliedBy(bnOrZero(data.gasPrice)).toString()

    const approvalRequired = await isApprovalRequired({
      adapter,
      sellAsset,
      allowanceContract: data.allowanceTarget,
      receiveAddress,
      sellAmount: data.sellAmount,
      web3,
      erc20AllowanceAbi,
    })

    const approvalFee = bnOrZero(APPROVAL_GAS_LIMIT)
      .multipliedBy(bnOrZero(data.gasPrice))
      .toString()

    const trade: ZrxTrade<EvmSupportedChainIds> = {
      sellAsset,
      buyAsset,
      bip44Params,
      receiveAddress,
      rate: data.price,
      depositAddress: data.to,
      feeData: {
        chainSpecific: {
          estimatedGas: estimatedGas.toString(),
          gasPrice: data.gasPrice,
          approvalFee: approvalRequired ? approvalFee : undefined,
        },
        networkFee,
        buyAssetTradeFeeUsd: '0',
        sellAssetTradeFeeUsd: '0',
      },
      txData: data.data,
      sellAmountCryptoPrecision: data.sellAmount,
      buyAmountCryptoPrecision: data.buyAmount,
      sources: data.sources?.filter((s) => parseFloat(s.proportion) > 0) || DEFAULT_SOURCE,
    }
    return trade as ZrxTrade<T>
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[zrxBuildTrade]', {
      code: SwapErrorTypes.BUILD_TRADE_FAILED,
    })
  }
}
